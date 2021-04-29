# Cavsjs

canvas能够在画布上绘制内容并输出图片，使用原生canvas api绘制很不灵活且方便；Cavsjs将canvas绘制操作封装成Cavs类，支持声明json的声明式绘制，分次绘制，跨域图片绘制。

## 开始

```html
  <script src="./js/Cavs.js"></script>
```

模块化方式使用，修改Cavs.js源代码导出为类即可

```js
import Cavs from "./js/Cavs.js" 
```

## 使用

1. 创建Cavs实例

```js
let $poster = document.querySelector('#shareCanvas');// canvas元素
let posterCavs = new Cavs({
  el: $poster,
  width: 570,
  height: 865 // 宽高决定输出图片的大小
});
```

2. 用json描述绘制内容

```js
let json = {
  type: 'image', // 图片
  x: 0,
  y: 0,
  w: 570,
  h: 865,
  url: './images/bg_share.png',
  childrens: [
    {
      type: 'text', // 文本
      x: 114,
      y: 34,
      string: '向向~',
      font: 'bold 24px arial,sans-serif',
      color: 'red'
    },{
      type: 'image',
      x: 60,
      y: 61.7,
      w: 68,
      h: 68,
      url: 'http://source.unsplash.com/random',
      origin: 'center',
      radius: 34 // 圆角
    },{
      type: 'image',
      x: 30,
      y: 672,
      w: 162,
      h: 162,
      url: qrcodeUrl
    },{
      type: 'image',
      x: 480,
      y: 773,
      w: 116,
      h: 116,
      url: 'images/logo.png',
      origin: 'center' // 坐标描述基准点
    },{
        type: 'rect', // 方框
        x: 200,
        y: 400,
        w: 40,
        h: 150,
        color: 'red',
        radius: 20,
        mode: 'stroke',
        lineWidth: 1
    }
  ]
}
```

3. 调用绘制

```js
posterCavs.draw(json);
// 支持多次绘制
posterCavs.draw(json2);
```

4.  输出为图片

```js
posterCavs.toImage(function (img) {
  img.setAttribute('class', 'postImg')
  document.querySelector('.wp').append(img);
})
```