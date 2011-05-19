# jquery.pjax.js
# copyright chris wanstrath
# https://github.com/defunkt/pjax

$ = jQuery

if window.history and window.history.pushState
  # Shortcuts for our favorite functions.
  replaceState = window.history.replaceState
  pushState = window.history.pushState
else
  # Fall back to normalcy for older browsers.
  $.pjax = $.noop
  $.fn.pjax = -> this
  return false

# When called on a link, fetches the href with ajax into the
# container specified as the first parameter or with the data-pjax
# attribute on the link itself.
#
# Tries to make sure the back button and ctrl+click work the way
# you'd expect.
#
# Accepts a jQuery ajax options object that may include these
# pjax specific options:
#
# container - Where to stick the response body. Usually a String selector.
#             $(container).html(xhr.responseBody)
#      push - Whether to pushState the URL. Defaults to true (of course).
#   replace - Want to use replaceState instead? That's cool.
#
# For convenience the first parameter can be either the container or
# the options object.
#
# Returns the jQuery object
$.fn.pjax = (container, options) ->
  if options
    options.container = container
  else
    options = if $.isPlainObject(container)
                container
              else
               container: container

  @live 'click', (event) ->
    # Middle click, cmd click, and ctrl click should open
    # links in a new tab as normal.
    return true if event.which > 1 or event.metaKey

    defaults =
      url: @href
      container: $(this).attr 'data-pjax'
      clickedElement: $(this)

    $.pjax $.extend({}, defaults, options)

    event.preventDefault()

    null

# Loads a URL with ajax, puts the response body inside a container,
# then pushState()'s the loaded URL.
#
# Works just like $.ajax in that it accepts a jQuery ajax
# settings object (with keys like url, type, data, etc).
#
# Accepts these extra keys:
#
# container - Where to stick the response body.
#             $(container).html(xhr.responseBody)
#      push - Whether to pushState the URL. Defaults to true (of course).
#   replace - Want to use replaceState instead? That's cool.
#
# Use it just like $.ajax:
#
#   var xhr = $.pjax({ url: this.href, container: '#main' })
#   console.log( xhr.readyState )
#
# Returns whatever $.ajax returns.
$.pjax = (options) ->
  $container = $ options.container
  success = options.success or $.noop

  # We don't want to let anyone override our success handler.
  delete options.success

  defaults =
    timeout: 650
    push: true
    replace: false
    # We want the browser to maintain two separate internal caches: one for
    # pjax'd partial page loads and one for normal page loads. Without
    # adding this secret parameter, some browsers will often confuse the two.
    data: {_pjax: true}
    type: 'GET'
    dataType: 'html'
    beforeSend: (xhr) ->
      $container.trigger 'start.pjax'
      xhr.setRequestHeader 'X-PJAX', 'true'
    error: ->
      window.location = options.url
    complete: ->
      $container.trigger 'end.pjax'
    success: (data) ->
      # If we got no data or an entire web page, go directly
      # to the page and let normal error handling happen.
      if not $.trim data or /<html/i.test data
        return window.location = options.url

      # Make it happen.
      $container.html data

      # If there's a <title> tag in the response, use it as
      # the page's title.
      oldTitle = document.title
      title = $.trim $container.find('title').remove().text()
      document.title = title if title

      state =
        pjax: options.container
        timeout: options.timeout

      # We can't persist $objects using the history API so we need to store
      # the string selector.
      if $.isPlainObject state.pjax
        state.pjax = state.pjax.selector

      # If there are extra params, save the complete URL in the state object
      query = $.param options.data
      if query isnt "_pjax=true"
        state.url  = options.url
        state.url += if /\?/.test(options.url) then "&" else "?"
        state.url += query

      if options.replace
        replaceState state, document.title, options.url
      else if options.push
        # this extra replaceState before first push ensures good back
        # button behavior
        if not $.pjax.active
          replaceState $.extend({}, state, {url:null}), oldTitle
          $.pjax.active = true

        pushState state, document.title, options.url

      # Google Analytics support
      if (options.replace or options.push) and window._gaq
        _gaq.push ['_trackPageview']

      # Invoke their success handler if they gave us one.
      success.apply this, arguments

  options = $.extend true, {}, defaults, options

  if $.isFunction options.url
    options.url = options.url()

  # Cancel the current request if we're already pjaxing
  xhr = $.pjax.xhr
  if xhr and xhr.readyState < 4
    xhr.onreadystatechange = $.noop
    xhr.abort()

  $.pjax.xhr = $.ajax options
  $(document).trigger 'pjax', $.pjax.xhr, options

  $.pjax.xhr

# Used to detect initial (useless) popstate.
# If history.state exists, assume browser isn't going to fire initial popstate.
popped = 'state' in window.history
initialURL = location.href

# popstate handler takes care of the back and forward buttons
#
# You probably shouldn't use pjax on pages with other pushState
# stuff yet.
$(window).bind 'popstate', (event) ->
  # Ignore inital popstate that some browsers fire on page load
  initialPop = not popped and location.href is initialURL
  popped = true
  return if initialPop

  state = event.state

  if state and state.pjax
    $container = $ state.pjax+''
    if $container.length
      $.pjax
        url: state.url or location.href
        container: $container
        push: false
        timeout: state.timeout
    else
      window.location = location.href

# Add the state property to jQuery's event object so we can use it in
# $(window).bind('popstate')
if $.event.props.indexOf('state') < 0
  $.event.props.push('state')
