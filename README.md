## pushState + ajax = pjax

            .--.
           /    \
          ## a  a
          (   '._)
           |'-- |
         _.\___/_   ___pjax___
       ."\> \Y/|<'.  '._.-'
      /  \ \_\/ /  '-' /
      | --'\_/|/ |   _/
      |___.-' |  |`'`
        |     |  |
        |    / './
       /__./` | |
          \   | |
           \  | |
           ;  | |
           /  | |
     jgs  |___\_.\_
          `-"--'---'


## what is it?

pjax loads HTML from your server into the current page
without a full reload. It's ajax with real permalinks,
page titles, and a working back button that fully degrades.

pjax enhances the browsing experience - nothing more.

You can find a demo on <http://pjax.heroku.com/>


## three ways to pjax on the client side:

One. Functionally obtrusive, loading the href with ajax into data-pjax:

```html
<a href='/explore' data-pjax='#main'>Explore</a>
```

```js
$('a[data-pjax]').pjax()
```


Two. Slightly obtrusive, passing a container and jQuery ajax options:

```html
<a href='/explore' class='js-pjax'>Explore</a>
```

```js
$('.js-pjax').pjax('#main', { timeout: null, error: function(xhr, err){
  $('.error').text('Something went wrong: ' + err)
}})
```


Three. Unobtrusive, showing a 'loading' spinner:

```html
<div id='main'>
  <div class='loader' style='display:none'><img src='spin.gif'></div>
  <div class='tabs'>
    <a href='/explore'>Explore</a>
    <a href='/help'>Help</a>
  </div>
</div>
```

```js
$('a').pjax('#main',{
  callback:{
    forward:function(){
      $(this).showLoader();
    },
    back:function(){
      $(this).hideLoader();
    }
  }
});
```


## $(link).pjax( selector, url, options )

The `$(link).pjax()` function accepts a container, an options object,
or both. The container MUST be a string selector - this is because we
cannot persist jQuery objects using the History API between page loads.

The options are the same as jQuery's `$.ajax` options with the
following additions:

* `selector`       - The String selector of the container to load the
                     reponse body. Must be a String.
* `clickedElement` - The element that was clicked to start the pjax call.
* `push`           - Whether to pushState the URL. Default: true (of course)
* `replace`        - Whether to replaceState the URL. Default: false
* `error`          - By default this callback reloads the target page once
                    `timeout` ms elapses.
* `timeout`        - pjax sets this low, <1s. Set this higher if using a
                     custom error handler. It's ms, so something like
                     `timeout: 2000`
* `fragment`       - A String selector that specifies a sub-element to
                     be pulled out of the response HTML and inserted
                     into the `container`. Useful if the server always returns
                     full HTML pages.

## pjax on the server side

This jquery.pjax.js can work without server setting.
And if you want some branch on server, check the request header
`request.headers['X-PJAX']`

## minimize it

```
curl \
  -d output_info=compiled_code \
  -d compilation_level=SIMPLE_OPTIMIZATIONS \
  -d code_url=https://github.com/ystskm/jquery-pjax/raw/master/jquery.pjax.js \
  http://closure-compiler.appspot.com/compile
```
