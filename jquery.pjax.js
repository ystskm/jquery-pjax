// Copyright (c) ystskm
// https://github.com/ystskm/jquery-pjax/LICENSE
(function($) {

  var initialURL = location.href;
  var currentURL = null;
  var pjaxMap = {};

  $.fn.pjax = function(selector, url, options) {

    // SPECIFICATION
    // $('div').pjax('#main1','/test1').pjax('#main2','/test2') ...
    
    // !! LIMITATION !!
    // CANNOT USE SAME URL IN HISTORY
    // $('div').pjax('#main1','/test1').pjax('#main2','/test1') ...
    // ...may occurs unexpected action.

    if(!pjaxMap[this.selector])
      pjaxMap[this.selector] = {
        _self: this,
        _selector: this.selector,
        _histArr: [],
        _histMap: {},
        _params: {}
      };

    if($.isPlainObject(selector))
      options = selector;
    else if($.isPlainObject(url)) {
      options = url;
      options.selector = selector;
    } else if($.isPlainObject(options)) {
      options.selector = selector;
      options.url = url;
    } else
      options = {
        selector: selector,
        url: url
      };

    var params = $.extend(true, pjax.defaults, {
      url: this.attr('href'),
      selector: this.attr('data-pjax'),
      onchange: {
        forward: null,
        back: null
      },
      callback: {
        forward: $.noop,
        back: $.noop
      }
    }, options);
    
    // not overwritable parameters
    params.trigger = this.selector;

    if($.isFunction(params.url))
      params.url = params.url();
    if(!/^\//.test(params.url))
      params.url = location.pathname.replace(/\/[^\/]*$/,'/') + params.url;

    if(!params.selector)
      throw new Error(
          'pjax must define attr("data-pjax") or options.selector .');

    if(!params.url)
      throw new Error('pjax must define attr("href") or options.url .');

    if(!$.isFunction(params.onchange.forward))
      params.onchange.forward = function(target, data) {
        target.html(data);
      };

    if(!$.isFunction(params.onchange.back))
      params.onchange.back = function(target, data) {
        target.html(data);
      };

    // save params
    var map = pjaxMap[this.selector];
    if(!map._histMap[params.url])
      map._histArr.push(params.url);
    map._histMap[params.url] = map._histArr.length - 1;
    map._params[params.url] = params;

    // attach push handler
    this.one('click', clkFn(map, params.url));

    // binding popstate eventHandler again
    $(window).one('popstate', popFn(map));

    return this;
  };
  function clkFn(map, url) {
    return function(event) {
      $.pjax(map._params[url]);
    };
  }
  function popFn(map) {
    return function(event) {
      // Ignore initial pop state that some browsers fire on page load
      if('state' in window.history && location.href == initialURL)
        return;
      // pop state action
      var state = event.state;
      if(state && state.pjax && state.trigger == map._selector) {
        if($(state.pjax).length)
          $.pjax({
            trigger: state.trigger,
            url: state.url || location.pathname,
            selector: state.pjax,
            push: false
          });
        else
          window.location = location.href;
      }
    };
  };
  // Returns whatever $.ajax returns.
  var pjax = $.pjax = function(options) {
    var map = pjaxMap[options.trigger];
    var histIdx = map._histMap[currentURL] != null ? map._histMap[currentURL]: -1;
    var nextIdx = map._histMap[options.url] || 0;
    var action = histIdx < nextIdx ? 'forward': 'back';
    if(!options.success)
      options = $
          .extend(
              {},
              action == 'forward' ? map._params[options.url]: map._params[currentURL],
              options);

    options.success = function(data) {
      var target = $(options.selector);

      // Make it happen.
      // "this" is XHR Object
      options.onchange[action].call(this, target, data);

      // If there's a <title> tag in the response, use it as
      // the page's title.
      var oldTitle = document.title;
      var title = $.trim(target.find('title').remove().text());
      if(title != null)
        document.title = title;

      // No <title>? Fragment? Look for data-title and title attributes.
      if(!title && options.fragment)
        title = $fragment.attr('title') || $fragment.data('title');

      // Make push state
      var state = {
        trigger: options.trigger,
        pjax: options.selector,
        url: options.url
      };

      // If there are extra params, save the complete URL in the state object
      if(options.data != null) {
        var query = $.param(options.data);
        if(query != "_pjax=true")
          state.url = options.url + (/\?/.test(options.url) ? "&": "?") + query;
      }
      if(options.replace) {
        window.history.replaceState(state, document.title, options.url);
      } else if(options.push === true) {
        // this extra replaceState before first push ensures good back
        // button behavior
        if($.pjax.active !== true) {
          window.history.replaceState($.extend({}, state, {
            url: null
          }), oldTitle);
          $.pjax.active = true;
        }
        window.history.pushState(state, document.title, options.url);
      }
      // Google Analytics support
      if((options.replace || options.push) && window._gaq)
        _gaq.push(['_trackPageview']);
      // If the URL has a hash in it, make sure the browser
      // knows to navigate to the hash.
      var hash = window.location.hash.toString();
      if(hash !== '')
        window.location.href = hash;

      // binding click event if first
      if(location.href == initialURL)
        map._self.one('click', clkFn(map, currentURL));

      // binding popstate eventHandler again
      $(window).one('popstate', popFn(map));

      // regist url
      currentURL = location.pathname;

      // callback action.
      options.callback[action].call(map._self, target);
    };

    // Cancel the current request if we're already pjaxing
    var xhr = $.pjax.xhr;
    if(xhr && xhr.readyState < 4) {
      xhr.onreadystatechange = $.noop;
      xhr.abort();
    }

    pjax.options = options;
    pjax.xhr = $.ajax(options);
    $(document).trigger('pjax', [pjax.xhr, options]);

    return pjax.xhr;
  };

  // default settings on ajax
  pjax.defaults = {
    timeout: 650,
    push: true,
    replace: false,
    // We want the browser to maintain two separate internal caches: one for
    // pjax'd partial page loads and one for normal page loads. Without
    // adding this secret parameter, some browsers will often confuse the two.
    data: {
      _pjax: true
    },
    type: 'GET',
    dataType: 'html',
    beforeSend: function(xhr) {
      $(this).trigger('pjax:start', [xhr, pjax.options]);
      xhr.setRequestHeader('X-PJAX', 'true');
    },
    error: function(xhr, textStatus, errorThrown) {
      if(textStatus !== 'abort')
        window.location = pjax.options.url;
    },
    complete: function(xhr) {
      $(this).trigger('pjax:end', [xhr, pjax.options]);
    }
  };

  // Add the state property to jQuery's event object so we can use it in
  // $(window).bind('popstate')
  if($.inArray('state', $.event.props) < 0)
    $.event.props.push('state');

  // Is pjax supported by this browser?
  $.support.pjax = window.history && window.history.pushState && window.history.replaceState
  // pushState isn't reliable on iOS yet.
  && !navigator.userAgent.match(/(iPod|iPhone|iPad|WebApps\/.+CFNetwork)/);

  // >> Fall back to normalcy for older browsers.
  if($.support.pjax !== true) {
    $.pjax = function(options) {
      window.location = $.isFunction(options.url) ? options.url(): options.url;
    };
    $.fn.pjax = function() {
      console.log('pjax is not supported on this browser.');
      return this;
    };
  }
  // << Fall back end.

})(window.jQuery);
