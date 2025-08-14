
(function() {
  'use strict';
  
  // Simple QR Code implementation
  function QRCode(typeNumber, errorCorrectLevel) {
    this.typeNumber = typeNumber || 1;
    this.errorCorrectLevel = errorCorrectLevel || 'L';
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }

  QRCode.prototype.addData = function(data) {
    this.dataList.push(data);
    this.dataCache = null;
  };

  QRCode.prototype.make = function() {
    if (this.dataList.length === 0) {
      throw new Error('No data to encode');
    }
    
    // Simple QR code generation - create a basic pattern
    this.moduleCount = 21; // Standard QR size
    this.modules = [];
    
    for (var r = 0; r < this.moduleCount; r++) {
      this.modules[r] = [];
      for (var c = 0; c < this.moduleCount; c++) {
        this.modules[r][c] = false;
      }
    }
    
    // Add position detection patterns (corners)
    this.addPositionDetectionPattern(0, 0);
    this.addPositionDetectionPattern(this.moduleCount - 7, 0);
    this.addPositionDetectionPattern(0, this.moduleCount - 7);
    
    // Add timing patterns
    this.addTimingPattern();
    
    // Add data (simple encoding)
    this.addDataPattern();
  };

  QRCode.prototype.addPositionDetectionPattern = function(row, col) {
    for (var r = 0; r < 7; r++) {
      for (var c = 0; c < 7; c++) {
        if ((r === 0 || r === 6 || c === 0 || c === 6) || 
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          this.modules[row + r][col + c] = true;
        }
      }
    }
  };

  QRCode.prototype.addTimingPattern = function() {
    for (var i = 8; i < this.moduleCount - 8; i++) {
      this.modules[i][6] = (i % 2 === 0);
      this.modules[6][i] = (i % 2 === 0);
    }
  };

  QRCode.prototype.addDataPattern = function() {
    var data = this.dataList.join('');
    var bitIndex = 0;
    
    // Firefox compatibility: ensure data is valid
    if (!data || data.length === 0) {
      data = 'test'; // Fallback data
    }
    
    for (var r = 0; r < this.moduleCount; r++) {
      for (var c = 0; c < this.moduleCount; c++) {
        // Skip position detection and timing patterns
        if (this.isPositionDetectionArea(r, c) || this.isTimingArea(r, c)) {
          continue;
        }
        
        // Simple data encoding - alternate pattern based on data
        if (bitIndex < data.length * 8) {
          var charCode = data.charCodeAt(Math.floor(bitIndex / 8));
          // Firefox compatibility: ensure charCode is valid
          if (isNaN(charCode) || charCode < 0) {
            charCode = 0;
          }
          var bit = (charCode >> (bitIndex % 8)) & 1;
          this.modules[r][c] = bit === 1;
          bitIndex++;
        } else {
          // Fill remaining modules with alternating pattern
          this.modules[r][c] = ((r + c) % 2 === 0);
        }
      }
    }
  };

  QRCode.prototype.isPositionDetectionArea = function(row, col) {
    return (row < 7 && col < 7) || 
           (row < 7 && col >= this.moduleCount - 7) || 
           (row >= this.moduleCount - 7 && col < 7);
  };

  QRCode.prototype.isTimingArea = function(row, col) {
    return row === 6 || col === 6;
  };

  QRCode.prototype.getModuleCount = function() {
    return this.moduleCount;
  };

  QRCode.prototype.isDark = function(row, col) {
    return this.modules[row][col];
  };

  // Error correction levels
  var QRErrorCorrectLevel = {
    L: 1,
    M: 0,
    Q: 3,
    H: 2
  };

<<<<<<< HEAD
  // Expose to global scope
  window.qrcode = QRCode;
=======
  // Expose to global scope - create a factory function that returns new instances
  window.qrcode = function(typeNumber, errorCorrectLevel) {
    return new QRCode(typeNumber, errorCorrectLevel);
  };
>>>>>>> cursor/fix-qr-code-scanning-in-firefox-806d
  window.QRErrorCorrectLevel = QRErrorCorrectLevel;
})();
