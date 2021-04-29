(function(){
  class Cavs {
    constructor (options) {
      let {el, width, height} = options;
      if(!el) return;
      this.el = el;
      this.width= width;
      this.height = height;
      this.ctx = el.getContext('2d');
      if (window.devicePixelRatio && window.devicePixelRatio > 1) { // Retina屏消除锯齿
        el.style.width = width + "px";
        el.style.height = height + "px";
        el.height = height * window.devicePixelRatio;
        el.width = width * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      } else {
        el.height = height;
        el.width = width;
      }
      this._sourceList = [];
      this._imgList = [];
      this._counter = 0;
      this._queue = null;
    }

    // prototype方法

    // 绘制前置处理
    _beforeDraw (json) {
      return new Promise(startDraw => {
        if (!this._queue) { // 第一次绘制
          this._queue = new Promise(nextDraw => {
            _getSourceList.call(this, json);
            _requestSourceList(this._sourceList).then(imgList => {
              startDraw(imgList);
              nextDraw();
            })
          });
        }else{
          this._queue = this._queue.then(() => { // 后续绘制前重置上次记录
            this._counter = 0;
            this._sourceList = [];
            _getSourceList.call(this, json);
            return _requestSourceList(this._sourceList).then(imgList => {
              startDraw(imgList)
            })
          })
        }
      })
    }

    // 绘制入口
    draw (json) {
      // 前置处理
      this._beforeDraw(json)
      .then(imgList => {
        // 绘制器开始绘制
        this._imgList = imgList;
        this._drawer(json);
      })
    }

    // 转为图片
    toImage (callback) {
      this._queue = this._queue.then(() => {
        let img = new Image();
        img.src = this.el.toDataURL('image/png');
        return callback(img)
      })
    }

    // 绘制器
    _drawer (json) {
      // 绘制前校准参数
      json = Object.assign({}, this.defaultOps, json);
      json.origin && this._setOrigin(json);

      switch (json.type) {
        case 'text':
          json.string && typeof json.string === 'string' && this._drawText(json);
          break;
        case 'image':
          json.url && typeof json.url === 'string' && this._drawImage(json);
          break;
        case 'rect':
          this._drawRect(json);
          break;
      }
      if (json.childrens) {
        for (let item of json.childrens) {
          this._drawer(item)
        }
      }
    }

    // 绘制image
    _drawImage (options) {
      let img = this._imgList[this._counter];
      if (img) {
        let ctx = this.ctx;
        let {x, y, w, h, radius} = options;
        if (radius) {
        ctx.save();
          // 绘制radius路径
          this._filletPath(x, y, w, h, radius);
        }
        ctx.drawImage(img, x, y, w, h);
        radius && ctx.restore();
      }
      this._counter += 1;
    }

    // 绘制文本
    _drawText(options) {
      let ctx = this.ctx;
      ctx.textBaseline = 'top';
      let {x, y, string, font, mode, color} = options;
      ctx.font = font;
      mode === 'stroke' ? ctx.strokeStyle = color : ctx.fillStyle = color;
      mode === 'stroke' ? ctx.strokeText(string, x, y) : ctx.fillText(string, x, y);
    }
    // 绘制矩形
    _drawRect(options) {
      let ctx = this.ctx;
      let {x, y, w, h, color, mode, lineWidth, radius} = options;
      ctx.lineWidth = lineWidth;
      ctx[mode+'Style'] = color;
      if (radius) {
        ctx.save();
        this._filletPath(x, y, w, h, radius);
        if(mode === 'stroke'){
          ctx.stroke();
          return radius && ctx.restore();
        }
      }
      mode === 'fill' ? ctx.fillRect(x, y, w, h) : ctx.strokeRect(x, y, w, h);
      radius && ctx.restore();
    }

    // 绘制圆角路径
    _filletPath (x, y, w, h, r) {
      let min = w < h ? w : h;
      r = r > min/2 ? min/2 : r;
      let ctx = this.ctx;

      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.clip();
    }

    // 转换基准坐标
    _setOrigin (json) {
      json.x = json.x - json.w/2;
      json.y = json.y - json.h/2;
    }

    // 绘制默认参数
    defaultOps = {
      x: 0,
      y: 0,
      w: 0, 
      h: 0,
      mode: 'fill',
      lineWidth: 1,
      radius: 0,
      font: '18px sans-serif',
      color: 'black'
    }
  }

// 拆分小处理

  // json提取资源列表
  function _getSourceList (json) {
    json.url && typeof json.url === 'string' && this._sourceList.push(json.url);
    if (json.childrens) {
      for (let item of json.childrens) {
        arguments.callee.call(this, item)
      }
    }
  }

  // 请求列表的资源，返回img标签
  function _requestSourceList (list) {
    return Promise.all(list.map(function (url) {
      if (_isCrossOrigin(url)) { // 资源跨域
        return new Promise(function(resolve){
          if (url.indexOf('https') === -1 && URL) { // 允许且支持跨域处理
          fetch(url, {
            method: 'GET',
            responseType: 'blob',
            mode: 'cors'
          })
            .then(res => res.blob())
            .then(blob => {
              let url = URL.createObjectURL(blob);
              _requestImage(url, resolve)
            })
          } else {
            resolve(); // 不支持则不请求资源
          }
        })
      }
      // 非跨域资源直接请求
      return new Promise(resolve => _requestImage(url, resolve))
    }))
  }

  // 请求图片资源并返回img元素
  function _requestImage (url, resolve) {
    let img = new Image();
    img.addEventListener('load', function () {
      resolve(img);
    })
    img.addEventListener('error', function () {
      resolve(); // 资源请求失败
    })
    img.setAttribute('src', url);
  }

  // 跨域资源检测
  function _isCrossOrigin(url){
    let host = location.host;
    let reg = /(^\.?\/)|(^[a-zA-Z]+\/)|(^data:)/;
    return !reg.test(url) && url.indexOf(host) === -1;
  }

  window.Cavs = Cavs;
})()