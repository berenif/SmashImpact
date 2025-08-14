(function(){
  var qrcode=function(typeNumber, errorCorrectLevel){
    var PAD0=0xEC, PAD1=0x11;
    var _typeNumber=typeNumber,_errorCorrectLevel=QRErrorCorrectLevel[errorCorrectLevel],_modules=null,_moduleCount=0,_dataList=[],_dataCache=null;
    var makeImpl=function(test,maskPattern){_moduleCount=_typeNumber?(_typeNumber*4+17):(40*4+17);_modules=new Array(_moduleCount);for(var r=0;r<_moduleCount;r++){_modules[r]=new Array(_moduleCount);for(var c=0;c<_moduleCount;c++)_modules[r][c]=null}setupPositionProbePattern(0,0);setupPositionProbePattern(_moduleCount-7,0);setupPositionProbePattern(0,_moduleCount-7);setupTimingPattern();setupTypeInfo(test,maskPattern);if(_typeNumber>=7)setupTypeNumber(test);var data=createData(getBestRSBlocks(_typeNumber,_errorCorrectLevel),_dataList);mapData(data,maskPattern)};
    var setupPositionProbePattern=function(row,col){for(var r=-1;r<=7;r++){if(row+r<=-1||_moduleCount<=row+r)continue;for(var c=-1;c<=7;c++){if(col+c<=-1||_moduleCount<=col+c)continue;_modules[row+r][col+c]= (0<=r&&r<=6&&(c==0||c==6))||(0<=c&&c<=6&&(r==0||r==6))||(2<=r&&r<=4&&2<=c&&c<=4);}}};
    var setupTimingPattern=function(){for(var r=8;r<_moduleCount-8;r++){if(_modules[r][6]==null)_modules[r][6]=(r%2==0);}for(var c=8;c<_moduleCount-8;c++){if(_modules[6][c]==null)_modules[6][c]=(c%2==0)}};
    var setupTypeNumber=function(test){var bits=QRUtil.getBCHTypeNumber(_typeNumber);for(var i=0;i<18;i++){_modules[Math.floor(i/3)][i%3+_moduleCount-11]=!test&&((bits>>(17-i))&1)==1;_modules[i%3+_moduleCount-11][Math.floor(i/3)]=!test&&((bits>>(17-i))&1)==1}};
    var setupTypeInfo=function(test,maskPattern){var data=(_errorCorrectLevel<<3)|maskPattern;var bits=QRUtil.getBCHTypeInfo(data);for(var i=0;i<15;i++){var mod=((bits>>i)&1)==1;if(i<6){_modules[i][8]=!test&&mod}else if(i<8){_modules[i+1][8]=!test&&mod}else{_modules[_moduleCount-15+i][8]=!test&&mod}}for(i=0;i<15;i++){mod=((bits>>i)&1)==1;if(i<8){_modules[8][_moduleCount-i-1]=!test&&mod}else if(i<9){_modules[8][15-i-1]=!test&&mod}else{_modules[8][14-i-1]=!test&&mod}}_modules[_moduleCount-8][8]=!test};
    var mapData=function(data,maskPattern){var inc=-1;var row=_moduleCount-1;var bitIndex=7;var byteIndex=0;for(var col=_moduleCount-1;col>0;col-=2){if(col==6)col--;while(true){for(var c=0;c<2;c++){if(_modules[row][col-c]==null){var dark=false;if(byteIndex<data.length){dark=((data[byteIndex]>>>bitIndex)&1)==1}if(QRUtil.getMask(maskPattern,row,col-c)){dark=!dark}_modules[row][col-c]=dark;bitIndex--;if(bitIndex==-1){byteIndex++;bitIndex=7}}}
          row+=inc;if(row<0||_moduleCount<=row){row-=inc;inc=-inc;break}}}};
    var putData=function(data){_dataList.push(new QR8bitByte(data));_dataCache=null};
    var make=function(){if(_typeNumber<1)_typeNumber=getBestTypeNumber(_dataList,_errorCorrectLevel);if(_dataCache==null)_dataCache=createData(getBestRSBlocks(_typeNumber,_errorCorrectLevel),_dataList);makeImpl(false,getBestMaskPattern())};
    var getBestMaskPattern=function(){var min=0,pattern=0;for(var i=0;i<8;i++){makeImpl(true,i);var lost=QRUtil.getLostPoint({modules:_modules,moduleCount:_moduleCount});if(i==0||lost<min){min=lost;pattern=i}}return pattern};
    var getModuleCount=function(){return _moduleCount};
    var isDark=function(r,c){return _modules[r][c]};
    return{addData:putData,make:make,getModuleCount:getModuleCount,isDark:isDark}
  };
  var QRMode={MODE_8BIT_BYTE:4};
  var QRErrorCorrectLevel={L:1,M:0,Q:3,H:2};
  var QRMaskPattern={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};
  var QRMath=function(){var EXP=new Array(256),LOG=new Array(256);for(var i=0;i<8;i++){EXP[i]=1<<i}for(i=8;i<256;i++){EXP[i]=EXP[i-4]^EXP[i-5]^EXP[i-6]^EXP[i-8]}for(i=0;i<255;i++){LOG[EXP[i]]=i}return{gexp:function(n){while(n<0)n+=255;while(n>=255)n-=255;return EXP[n]},glog:function(n){if(n<1)throw new Error('glog');return LOG[n]}}}();
  function QRPolynomial(num, shift){var offset=0;while(offset<num.length&&num[offset]==0)offset++;this.num=new Array(num.length-offset+shift);for(var i=0;i<num.length-offset;i++)this.num[i]=num[i+offset]}
  QRPolynomial.prototype.get=function(i){return this.num[i]};
  QRPolynomial.prototype.getLength=function(){return this.num.length};
  QRPolynomial.prototype.multiply=function(e){var num=new Array(this.getLength()+e.getLength()-1);for(var i=0;i<this.getLength();i++){for(var j=0;j<e.getLength();j++){num[i+j]^=QRMath.gexp(QRMath.glog(this.get(i))+QRMath.glog(e.get(j)))}}return new QRPolynomial(num,0)};
  QRPolynomial.prototype.mod=function(e){if(this.getLength()-e.getLength()<0)return this;var ratio=QRMath.glog(this.get(0))-QRMath.glog(e.get(0));var num=new Array(this.getLength());for(var i=0;i<this.getLength();i++){num[i]=this.get(i)}for(i=0;i<e.getLength();i++){num[i]^=QRMath.gexp(QRMath.glog(e.get(i))+ratio)}return new QRPolynomial(num,0).mod(e)};
  function QRRSBlock(totalCount,dataCount){this.totalCount=totalCount;this.dataCount=dataCount}
  var RS_BLOCK_TABLE = {};
  RS_BLOCK_TABLE[(QRErrorCorrectLevel.L<<8)+40] = [
    19, 148, 118,
     6, 149, 119
  ];
  function getBestRSBlocks(typeNumber,ec){if(typeNumber==0)typeNumber=40;var rs=RS_BLOCK_TABLE[(ec<<8)+typeNumber];var list=[];for(var i=0;i<rs.length/3;i++){var count=rs[i*3+0],total=rs[i*3+1],dc=rs[i*3+2];for(var j=0;j<count;j++){list.push(new QRRSBlock(total,dc))}}return list}
  var QRBitBuffer=function(){this.buffer=[];this.length=0};
  QRBitBuffer.prototype.get=function(i){return ((this.buffer[Math.floor(i/8)]>>> (7-i%8)) & 1)==1};
  QRBitBuffer.prototype.put=function(num,length){for(var i=0;i<length;i++)this.putBit(((num>>> (length-i-1))&1)==1)};
  QRBitBuffer.prototype.putBit=function(bit){this.buffer[Math.floor(this.length/8)]>>>=0;if(this.length%8==0)this.buffer.push(0);if(bit)this.buffer[Math.floor(this.length/8)]|=(0x80>>> (this.length%8));this.length++};
  var QRUtil=(function(){
    var PATTERN_POSITION_TABLE=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,54,82,110,138],[6,30,56,84,112,140],[6,34,62,90,118,146],[6,30,58,86,114,142,170]];
    var G15=0x537,G18=0x1f25,G15_MASK=0x5412;
    function getPatternPosition(typeNumber){ return PATTERN_POSITION_TABLE[typeNumber-1]||[]; }
    function getBCHTypeInfo(data){var d=data<<10;while(getBCHDigit(d)-getBCHDigit(G15)>=0)d^=(G15<<(getBCHDigit(d)-getBCHDigit(G15)));return ((data<<10)|d)^G15_MASK}
    function getBCHTypeNumber(data){var d=data<<12;while(getBCHDigit(d)-getBCHDigit(G18)>=0)d^=(G18<<(getBCHDigit(d)-getBCHDigit(G18)));return (data<<12)|d}
    function getBCHDigit(data){var digit=0;while(data!=0){digit++;data>>>=1}return digit}
    function getMask(maskPattern,i,j){switch(maskPattern){case 0: return (i+j)%2==0; case 1: return i%2==0; case 2: return j%3==0; case 3: return (i+j)%3==0; case 4: return (Math.floor(i/2)+Math.floor(j/3))%2==0; case 5: return (i*j)%2+(i*j)%3==0; case 6: return ((i*j)%2+(i*j)%3)%2==0; case 7: return ((i*j)%3+(i+j)%2)%2==0; default: throw new Error('bad mask')}}
    function getLostPoint(qr){
      var mc=qr.moduleCount,modules=qr.modules,lost=0;
      for(var r=0;r<mc;r++){
        for(var c=0;c<mc;c++){
          var same=0;var dark=modules[r][c];
          for(var rr=-1;rr<=1;rr++){
            if(r+rr<0||mc<=r+rr)continue;
            for(var cc=-1;cc<=1;cc++){
              if(c+cc<0||mc<=c+cc)continue;
              if(rr==0&&cc==0)continue;
              if(dark==modules[r+rr][c+cc])same++;
            }
          }
          if(same>5)lost+=(3+same-5)
        }
      }
      for(var r=0;r<mc;r++) for(var c=0;c<mc-6;c++){
        if(modules[r][c]&&!modules[r][c+1]&&modules[r][c+2]&&modules[r][c+3]&&modules[r][c+4]&&!modules[r][c+5]&&modules[r][c+6])lost+=40;
      }
      for(var c=0;c<mc;c++) for(var r=0;r<mc-6;r++){
        if(modules[r][c]&&!modules[r+1][c]&&modules[r+2][c]&&modules[r+3][c]&&modules[r+4][c]&&!modules[r+5][c]&&modules[r+6][c])lost+=40;
      }
      var darkCount=0;for(var r=0;r<mc;r++)for(var c=0;c<mc;c++)if(modules[r][c])darkCount++;
      var ratio=Math.abs(100*darkCount/mc/mc-50)/5;lost+=ratio*10;return lost;
    }
    return{getBCHTypeInfo:getBCHTypeInfo,getBCHTypeNumber:getBCHTypeNumber,getMask:getMask,getLostPoint:getLostPoint}
  })();
  function QR8bitByte(data){this.mode=QRMode.MODE_8BIT_BYTE;this.data=data}
  QR8bitByte.prototype.getLength=function(){return this.data.length};
  QR8bitByte.prototype.write=function(buffer){for(var i=0;i<this.data.length;i++)buffer.put(this.data.charCodeAt(i),8)};
  function getBestTypeNumber(list, ec){ return 40; }
  function createData(rsBlocks, dataList){var buffer=new QRBitBuffer();buffer.put(QRMode.MODE_8BIT_BYTE,4);var length=dataList[0].getLength();buffer.put(length,8);dataList[0].write(buffer);var totalDataCount=0;for(var i=0;i<rsBlocks.length;i++)totalDataCount+=rsBlocks[i].dataCount;while(buffer.length+4<=totalDataCount*8)buffer.put(0,4);while(buffer.length%8!=0)buffer.putBit(false);var data=[];for(i=0;i<buffer.buffer.length;i++)data.push(buffer.buffer[i]);return createBytes(data, rsBlocks)}
  function createBytes(buffer, rsBlocks){var offset=0;var maxDc=0;var maxEc=0;var dcdata=[];var ecdata=[];for(var r=0;r<rsBlocks.length;r++){var dcCount=rsBlocks[r].dataCount;var ecCount=rsBlocks[r].totalCount-dcCount;maxDc=Math.max(maxDc, dcCount);maxEc=Math.max(maxEc, ecCount);dcdata[r]=new Array(dcCount);for(var i=0;i<dcdata[r].length;i++){dcdata[r][i]=buffer[i+offset]}offset+=dcCount;var rsPoly=getErrorCorrectPolynomial(ecCount);var rawPoly=new QRPolynomial(dcdata[r],0);var modPoly=rawPoly.mod(rsPoly);ecdata[r]=new Array(ecCount);for(i=0;i<ecdata[r].length;i++){var modIndex=i+modPoly.getLength()-ecCount;ecdata[r][i]=(modIndex>=0)?modPoly.get(modIndex):0}
  var totalCodeCount=0;for(r=0;r<rsBlocks.length;r++)totalCodeCount+=rsBlocks[r].totalCount;var data=[];for(i=0;i<totalCodeCount;i++)data.push(0);var index=0;for(i=0;i<maxDc;i++)for(r=0;r<rsBlocks.length;r++)if(i<dcdata[r].length)data[index++]=dcdata[r][i];for(i=0;i<maxEc;i++)for(r=0;r<rsBlocks.length;r++)if(i<ecdata[r].length)data[index++]=ecdata[r][i];return data}
  function getErrorCorrectPolynomial(ecLength){var a=new QRPolynomial([1],0);for(var i=0;i<ecLength;i++)a=a.multiply(new QRPolynomial([1, QRMath.gexp(i)],0));return a}

  window.qrcode = qrcode;
  window.QRErrorCorrectLevel = QRErrorCorrectLevel;
  window.RS_BLOCK_TABLE = RS_BLOCK_TABLE;
})();