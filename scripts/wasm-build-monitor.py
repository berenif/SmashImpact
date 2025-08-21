#!/usr/bin/env python3
"""
WASM Build Monitor
Advanced file watcher and build system with real-time monitoring and notifications
"""

import os
import sys
import json
import time
import hashlib
import subprocess
import threading
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Optional
from dataclasses import dataclass, asdict
from collections import deque

# Try to import watchdog for file monitoring
try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
    WATCHDOG_AVAILABLE = True
except ImportError:
    WATCHDOG_AVAILABLE = False
    print("Warning: watchdog not installed. Using polling mode.")

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/workspace/logs/build-monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ANSI color codes
class Colors:
    RESET = '\033[0m'
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'

@dataclass
class BuildStats:
    """Statistics for a build operation"""
    start_time: float
    end_time: float
    success: bool
    mode: str
    files_changed: List[str]
    output_size_js: int = 0
    output_size_wasm: int = 0
    error_message: str = ""
    warnings: List[str] = None
    
    @property
    def duration(self) -> float:
        return self.end_time - self.start_time
    
    def to_dict(self) -> dict:
        return asdict(self)

class BuildMonitor:
    """Main build monitoring and automation system"""
    
    def __init__(self, config_file: str = "/workspace/wasm-build.config.json"):
        self.config_file = config_file
        self.config = self.load_config()
        self.file_hashes: Dict[str, str] = {}
        self.build_history: deque = deque(maxlen=100)
        self.is_building = False
        self.build_lock = threading.Lock()
        self.stats = {
            'total_builds': 0,
            'successful_builds': 0,
            'failed_builds': 0,
            'total_build_time': 0,
            'last_build': None
        }
        
        # Setup directories
        self.setup_directories()
        
        # Load previous hashes if cache exists
        self.load_cache()
    
    def load_config(self) -> dict:
        """Load build configuration from JSON file"""
        try:
            with open(self.config_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"Config file {self.config_file} not found. Using defaults.")
            return self.get_default_config()
    
    def get_default_config(self) -> dict:
        """Return default configuration"""
        return {
            'paths': {
                'workspace': '/workspace',
                'wasm_dir': 'wasm',
                'public_dir': 'public',
                'cache_dir': '.build-cache',
                'logs_dir': 'logs'
            },
            'build_modes': {
                'release': {
                    'optimization': '-O3',
                    'flags': ['-s MALLOC=emmalloc']
                }
            },
            'watch': {
                'enabled': True,
                'debounce_ms': 1000
            }
        }
    
    def setup_directories(self):
        """Create necessary directories"""
        dirs = [
            self.config['paths']['public_dir'],
            self.config['paths']['cache_dir'],
            self.config['paths']['logs_dir']
        ]
        for dir_path in dirs:
            Path(dir_path).mkdir(parents=True, exist_ok=True)
    
    def calculate_file_hash(self, filepath: str) -> str:
        """Calculate MD5 hash of a file"""
        hash_md5 = hashlib.md5()
        try:
            with open(filepath, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_md5.update(chunk)
            return hash_md5.hexdigest()
        except FileNotFoundError:
            return ""
    
    def has_file_changed(self, filepath: str) -> bool:
        """Check if a file has changed since last build"""
        current_hash = self.calculate_file_hash(filepath)
        old_hash = self.file_hashes.get(filepath, "")
        
        if current_hash != old_hash:
            self.file_hashes[filepath] = current_hash
            return True
        return False
    
    def get_source_files(self) -> List[str]:
        """Get all source files to monitor"""
        files = []
        wasm_dir = Path(self.config['paths']['wasm_dir'])
        
        # Add main source file
        main_file = wasm_dir / "game_engine.cpp"
        if main_file.exists():
            files.append(str(main_file))
        
        # Add additional source files
        for pattern in ['**/*.cpp', '**/*.h', '**/*.hpp']:
            files.extend([str(f) for f in wasm_dir.glob(pattern)])
        
        return files
    
    def check_emscripten(self) -> bool:
        """Check if Emscripten is available"""
        try:
            result = subprocess.run(['emcc', '--version'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                logger.info(f"Emscripten found: {result.stdout.split()[0]}")
                return True
        except FileNotFoundError:
            pass
        
        # Try to source emsdk environment
        emsdk_env = Path(self.config['paths']['workspace']) / 'emsdk' / 'emsdk_env.sh'
        if emsdk_env.exists():
            logger.info("Sourcing Emscripten environment...")
            os.environ['PATH'] = f"/workspace/emsdk/upstream/emscripten:{os.environ['PATH']}"
            return self.check_emscripten()
        
        logger.error("Emscripten not found!")
        return False
    
    def build(self, mode: str = 'release', changed_files: List[str] = None) -> BuildStats:
        """Execute the build process"""
        with self.build_lock:
            if self.is_building:
                logger.warning("Build already in progress. Skipping...")
                return None
            self.is_building = True
        
        start_time = time.time()
        build_stats = BuildStats(
            start_time=start_time,
            end_time=0,
            success=False,
            mode=mode,
            files_changed=changed_files or []
        )
        
        try:
            logger.info(f"{Colors.CYAN}Starting {mode} build...{Colors.RESET}")
            
            # Check if Emscripten is available
            if not self.check_emscripten():
                raise RuntimeError("Emscripten not available")
            
            # Prepare build command
            build_cmd = self.prepare_build_command(mode)
            logger.info(f"Build command: {build_cmd}")
            
            # Execute build
            result = subprocess.run(
                build_cmd,
                shell=True,
                capture_output=True,
                text=True,
                cwd=self.config['paths']['workspace']
            )
            
            # Check result
            if result.returncode == 0:
                build_stats.success = True
                logger.info(f"{Colors.GREEN}✓ Build successful!{Colors.RESET}")
                
                # Get output file sizes
                js_file = Path(self.config['paths']['public_dir']) / 'game_engine.js'
                wasm_file = Path(self.config['paths']['public_dir']) / 'game_engine.wasm'
                
                if js_file.exists():
                    build_stats.output_size_js = js_file.stat().st_size
                if wasm_file.exists():
                    build_stats.output_size_wasm = wasm_file.stat().st_size
                
                logger.info(f"Output: JS={build_stats.output_size_js/1024:.1f}KB, "
                          f"WASM={build_stats.output_size_wasm/1024:.1f}KB")
            else:
                build_stats.success = False
                build_stats.error_message = result.stderr
                logger.error(f"{Colors.RED}✗ Build failed!{Colors.RESET}")
                logger.error(result.stderr)
            
            # Parse warnings from output
            if result.stdout:
                warnings = [line for line in result.stdout.split('\n') 
                          if 'warning' in line.lower()]
                if warnings:
                    build_stats.warnings = warnings
                    logger.warning(f"Build completed with {len(warnings)} warnings")
            
        except Exception as e:
            build_stats.success = False
            build_stats.error_message = str(e)
            logger.error(f"Build error: {e}")
        
        finally:
            build_stats.end_time = time.time()
            self.is_building = False
            
            # Update statistics
            self.update_stats(build_stats)
            
            # Save build history
            self.build_history.append(build_stats)
            self.save_build_history()
            
            # Save cache
            self.save_cache()
        
        return build_stats
    
    def prepare_build_command(self, mode: str) -> str:
        """Prepare the emcc build command"""
        mode_config = self.config['build_modes'].get(mode, {})
        
        # Get source files
        sources = []
        main_file = Path(self.config['paths']['wasm_dir']) / 'game_engine.cpp'
        if main_file.exists():
            sources.append(str(main_file))
        
        entity_file = Path(self.config['paths']['wasm_dir']) / 'src' / 'entity.cpp'
        if entity_file.exists():
            sources.append(str(entity_file))
        
        # Get includes
        includes = f"-I{self.config['paths']['wasm_dir']}/include"
        
        # Get flags
        flags = ' '.join(self.config.get('common_flags', []))
        flags += ' ' + mode_config.get('optimization', '-O3')
        flags += ' ' + ' '.join(mode_config.get('flags', []))
        
        # Output file
        output = f"{self.config['paths']['public_dir']}/game_engine.js"
        
        # Build command
        cmd = f"emcc {' '.join(sources)} {includes} {flags} -o {output}"
        return cmd
    
    def update_stats(self, build_stats: BuildStats):
        """Update build statistics"""
        self.stats['total_builds'] += 1
        if build_stats.success:
            self.stats['successful_builds'] += 1
        else:
            self.stats['failed_builds'] += 1
        self.stats['total_build_time'] += build_stats.duration
        self.stats['last_build'] = datetime.now().isoformat()
        
        # Calculate success rate
        if self.stats['total_builds'] > 0:
            success_rate = (self.stats['successful_builds'] / 
                          self.stats['total_builds']) * 100
            avg_build_time = self.stats['total_build_time'] / self.stats['total_builds']
            
            logger.info(f"Stats: {self.stats['successful_builds']}/{self.stats['total_builds']} "
                       f"builds succeeded ({success_rate:.1f}%), "
                       f"avg time: {avg_build_time:.2f}s")
    
    def save_cache(self):
        """Save file hashes to cache"""
        cache_file = Path(self.config['paths']['cache_dir']) / 'file_hashes.json'
        try:
            with open(cache_file, 'w') as f:
                json.dump(self.file_hashes, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save cache: {e}")
    
    def load_cache(self):
        """Load file hashes from cache"""
        cache_file = Path(self.config['paths']['cache_dir']) / 'file_hashes.json'
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    self.file_hashes = json.load(f)
                logger.info(f"Loaded cache with {len(self.file_hashes)} file hashes")
            except Exception as e:
                logger.error(f"Failed to load cache: {e}")
    
    def save_build_history(self):
        """Save build history to file"""
        history_file = Path(self.config['paths']['logs_dir']) / 'build_history.json'
        try:
            history_data = [stats.to_dict() for stats in self.build_history]
            with open(history_file, 'w') as f:
                json.dump(history_data, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to save build history: {e}")
    
    def watch(self, mode: str = 'release'):
        """Start watching files for changes"""
        logger.info(f"{Colors.CYAN}Starting file watcher in {mode} mode...{Colors.RESET}")
        logger.info(f"Watching: {self.config['paths']['wasm_dir']}")
        logger.info("Press Ctrl+C to stop")
        
        # Initial build
        self.build(mode)
        
        if WATCHDOG_AVAILABLE:
            self.watch_with_watchdog(mode)
        else:
            self.watch_with_polling(mode)
    
    def watch_with_watchdog(self, mode: str):
        """Use watchdog library for file monitoring"""
        class WASMEventHandler(FileSystemEventHandler):
            def __init__(self, monitor, build_mode):
                self.monitor = monitor
                self.build_mode = build_mode
                self.pending_changes = set()
                self.last_event_time = 0
                self.debounce_time = monitor.config['watch'].get('debounce_ms', 1000) / 1000
            
            def on_modified(self, event):
                if event.is_directory:
                    return
                if event.src_path.endswith(('.cpp', '.h', '.hpp')):
                    self.pending_changes.add(event.src_path)
                    current_time = time.time()
                    
                    # Debounce: wait for a quiet period before building
                    if current_time - self.last_event_time > self.debounce_time:
                        if self.pending_changes:
                            logger.info(f"{Colors.YELLOW}Changes detected in {len(self.pending_changes)} files{Colors.RESET}")
                            self.monitor.build(self.build_mode, list(self.pending_changes))
                            self.pending_changes.clear()
                    
                    self.last_event_time = current_time
        
        event_handler = WASMEventHandler(self, mode)
        observer = Observer()
        observer.schedule(event_handler, self.config['paths']['wasm_dir'], recursive=True)
        observer.start()
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            observer.stop()
            logger.info("Stopping file watcher...")
        observer.join()
    
    def watch_with_polling(self, mode: str):
        """Fallback polling method for file monitoring"""
        logger.info("Using polling mode (install watchdog for better performance)")
        
        try:
            while True:
                time.sleep(2)  # Poll every 2 seconds
                
                changed_files = []
                for filepath in self.get_source_files():
                    if self.has_file_changed(filepath):
                        changed_files.append(filepath)
                
                if changed_files:
                    logger.info(f"{Colors.YELLOW}Changes detected in {len(changed_files)} files{Colors.RESET}")
                    self.build(mode, changed_files)
        
        except KeyboardInterrupt:
            logger.info("Stopping file watcher...")
    
    def print_dashboard(self):
        """Print a build statistics dashboard"""
        print(f"\n{Colors.CYAN}{'='*60}{Colors.RESET}")
        print(f"{Colors.BOLD}WASM Build Monitor Dashboard{Colors.RESET}")
        print(f"{Colors.CYAN}{'='*60}{Colors.RESET}")
        
        if self.stats['total_builds'] > 0:
            success_rate = (self.stats['successful_builds'] / 
                          self.stats['total_builds']) * 100
            avg_build_time = self.stats['total_build_time'] / self.stats['total_builds']
            
            print(f"Total Builds:     {self.stats['total_builds']}")
            print(f"Successful:       {Colors.GREEN}{self.stats['successful_builds']}{Colors.RESET}")
            print(f"Failed:           {Colors.RED}{self.stats['failed_builds']}{Colors.RESET}")
            print(f"Success Rate:     {success_rate:.1f}%")
            print(f"Avg Build Time:   {avg_build_time:.2f}s")
            print(f"Last Build:       {self.stats['last_build']}")
        else:
            print("No builds yet")
        
        print(f"{Colors.CYAN}{'='*60}{Colors.RESET}\n")

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='WASM Build Monitor')
    parser.add_argument('command', choices=['build', 'watch', 'stats', 'clean'],
                       help='Command to execute')
    parser.add_argument('--mode', default='release',
                       choices=['debug', 'profile', 'release'],
                       help='Build mode')
    parser.add_argument('--config', default='/workspace/wasm-build.config.json',
                       help='Path to configuration file')
    
    args = parser.parse_args()
    
    # Create monitor instance
    monitor = BuildMonitor(args.config)
    
    # Execute command
    if args.command == 'build':
        monitor.build(args.mode)
    elif args.command == 'watch':
        monitor.watch(args.mode)
    elif args.command == 'stats':
        monitor.print_dashboard()
    elif args.command == 'clean':
        # Clean build artifacts
        logger.info("Cleaning build artifacts...")
        import shutil
        shutil.rmtree(monitor.config['paths']['cache_dir'], ignore_errors=True)
        logger.info("Clean complete!")

if __name__ == '__main__':
    main()