/* 
 * jquery.pjax.js
 * copyright ystskm
 * https://github.com/ystskm/jquery-pjax
 */
(function($) {
  $.fn.pjax = function(selector, options) {
    options = $.isPlainObject(selector) ? selector: {
      selector: selector
    };

    var params = $.extend({
      url: this.attr('href'),
      selector: this.attr('data-pjax'),
    }, options);
    
    if($.isFunction(params.url))
      params.url = params.url();

    return this.click(function(event) {
      console.log('clicked.');
      $.pjax(params);
    });
  };

  // Returns whatever $.ajax returns.
  var pjax = $.pjax = function(options) {

    options.success = function(data) {

      // Make it happen.
      this.html(data);

      // If there's a <title> tag in the response, use it as
      // the page's title.
      var oldTitle = document.title, title = $.trim(this.find('title').remove()
          .text());
      if(title != null)
        document.title = title;

      // No <title>? Fragment? Look for data-title and title attributes.
      if(!title && options.fragment)
        title = $fragment.attr('title') || $fragment.data('title');

      var state = {
        pjax: options.selector,
        fragment: options.fragment,
        timeout: options.timeout
      };

      // If there are extra params, save the complete URL in the state object
      var query = $.param(options.data);
      if(query != "_pjax=true")
        state.url = options.url + (/\?/.test(options.url) ? "&": "?") + query;

      if(options.replace) {
        window.history.replaceState(state, document.title, options.url);
      } else if(options.push) {
        // this extra replaceState before first push ensures good back
        // button behavior
        if(!$.pjax.active) {
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

      // Invoke their success handler if they gave us one.
      success.apply(this, arguments);
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
      this.trigger('pjax:start', [xhr, pjax.options]);
      xhr.setRequestHeader('X-PJAX', 'true');
    },
    error: function(xhr, textStatus, errorThrown) {
      if(textStatus !== 'abort')
        window.location = pjax.options.url;
    },
    complete: function(xhr) {
      this.trigger('pjax:end', [xhr, pjax.options]);
    }
  };

  // Used to detect initial (useless) popstate.
  // If history.state exists, assume browser isn't going to fire initial popstate.
  var popped = ('state' in window.history), initialURL = location.href;

  // popstate handler takes care of the back and forward buttons
  //
  // You probably shouldn't use pjax on pages with other pushState
  // stuff yet.
  $(window).bind('popstate', function(event) {
    // Ignore inital popstate that some browsers fire on page load
    var initialPop = !popped && location.href == initialURL;
    popped = true;
    if(initialPop)
      return;

    var state = event.state;

    if(state && state.pjax) {
      var selector = state.pjax;
      if($(selector + '').length)
        $.pjax({
          url: state.url || location.href,
          fragment: state.fragment,
          container: container,
          push: false,
          timeout: state.timeout
        });
      else
        window.location = location.href;
    }
  });

  // Add the state property to jQuery's event object so we can use it in
  // $(window).bind('popstate')
  if($.inArray('state', $.event.props) < 0)
    $.event.props.push('state');

    // Is pjax supported by this browser?
  $.support.pjax = window.history && window.history.pushState && window.history.replaceState
  // pushState isn't reliable on iOS yet.
  && !navigator.userAgent.match(/(iPod|iPhone|iPad|WebApps\/.+CFNetwork)/);

  // Fall back to normalcy for older browsers.
  if($.support.pjax !== true) {
    $.pjax = function(options) {
      window.location = $.isFunction(options.url) ? options.url(): options.url;
    };
    $.fn.pjax = function() {
      console.log('pjax is not supported on this browser.');
      return this;
    };
  }

})(jQuery);
