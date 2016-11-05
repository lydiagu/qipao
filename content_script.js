// (function() {

  console.log('Running content script');

  var extracted_properties = [];
  var original = null;
  var in_selection = null; // selector for items in group
  var pattern = null; // potential siblings
  var current_selector = null;

  var create_jquery_selector = function(descriptors) {
    var selector = [];
    for (var i = descriptors.length - 1; i >= 0; i--) {
      var level = descriptors[i][0];
      if (descriptors[i][1] != null) {
        // nth-child() selector is 1-indexed.
        level += ':nth-child(' + (descriptors[i][1] + 1) + ')';
      }
      selector.push(level);
    }
    return selector.join(' ');
  };

  var update_display = function() {
    var html = '';
    html += '<ul>';
    for (var i = 0; i < extracted_properties.length; i++) {
      html += '<li class="saved-property">'+extracted_properties[i][0]+'</li>';
    }
    html += '</ul>';
    $('#qipao-properties-list').html(html);
  };

  var update_with_reject = function(out_selection) {
    console.log(out_selection[0].join(' '));
    for (var i = 0; i < original.length; i++) {
      console.log(original[i], out_selection[i]);
      if (original[i][0] != out_selection[i][0] ||
          original[i][1] != out_selection[i][1]) {
        // If i is less than length of pattern, add index.
        if (i < pattern.length) {
          pattern[i][1] = original[i][1];
        } else if (original[i][0] != out_selection[i][0]) {
          // Check if tags are mismatched.
          for (var j = pattern.length; j <= i; j++) {
            pattern.push([original[j][0], null]);
          }
        } else if (original[i][1] != out_selection[i][1]) {
          // Indices are mismatched.
          for (var j = pattern.length; j <= i; j++) {
            pattern.push([original[j][0], null]);
          }
          pattern[i][1] = original[i][1];
        }
        break;
      }
    }
    var selector = create_jquery_selector(pattern);
    console.log('new selector', selector);
    $(current_selector).not(selector).removeClass('qipao-selected')
      .each(function() {
        // High accept/reject boxes.
        var qipaoid = $(this).attr("qipao-id");
        $('#qipao-'+qipaoid).css('display', 'None');
      });
  };

  var update_with_accept = function(out_selection) {
    console.log(out_selection[0].join(' '));
    for (var i = 0; i < in_selection.length; i++) {
      console.log(original[i], out_selection[i]);
      if (original[i][0] != out_selection[i][0] ||
          original[i][1] != out_selection[i][1]) {
        // If i is less than length of pattern, remove index.
        in_selection[i][1] = null;
        break;
      }
    }
    var selector = create_jquery_selector(in_selection);
    console.log('new selector', selector);
    $(selector).removeClass('qipao-selected')
      .each(function() {
        // High accept/reject boxes.
        var qipaoid = $(this).attr("qipao-id");
        $('#qipao-'+qipaoid).css('display', 'None');
      });
    $(selector).addClass('qipao-selected-in');
  };

  var get_selector_list = function(element) {
    // Returns list of (tagName, index) for element and all its parents.
    var tags = []
    tagName = element.prop("tagName");
    element.parents().each(function() {
      tags.push([$(this).prop("tagName"), $(this).index()]);
    });
    tags.unshift([tagName, element.index()]);
    return tags;
  };

  var find_similar_tags = function(element) {
    console.log('Finding siblings');
    var tags = get_selector_list(element);
    original = tags.slice(0);
    
    // By default, start with 4 levels.
    pattern = [];
    var max_levels = Math.min(original.length, 4);
    for (var i = 0; i < max_levels; i++) {
      pattern.push([original[i][0], null]);
    }
    current_selector = create_jquery_selector(pattern);
    console.log('selector', current_selector);
    in_selection = original.slice(0,4);
    console.log('in selection', in_selection);

    // Highlight siblings
    var count = 0;
    var in_selector = create_jquery_selector(in_selection);
    $(in_selector).addClass('qipao-selected-in')
    $(current_selector).not(in_selector).addClass('qipao-selected')
      .each(function() {
        $(this).attr("qipao-id", count);
        $('body').append(
          '<div class="highlight-box" id="qipao-' + count +
            '"><a class="highlight-button accept-highlight">' +
            '</a><a class="highlight-button reject-highlight"></a></div>');
        // console.log('Adding ', count)
        var offset = $(this).offset()
        offset.left = offset.left + $(this).width();
        $('#qipao-'+count).offset(offset);
        count += 1;
      });

    // Click handlers for accept-reject buttons.
    $('.reject-highlight').click(function() {
      var qipaoid = $(this).parent().attr('id').split('-')[1]
      console.log('qipao-', qipaoid);
      element = $("[qipao-id='"+qipaoid+"']").first();
      update_with_reject(get_selector_list(element));
    });

    $('.accept-highlight').click(function() {
      var qipaoid = $(this).parent().attr('id').split('-')[1]
      console.log('qipao-', qipaoid);
      element = $("[qipao-id='"+qipaoid+"']").first();
      update_with_accept(get_selector_list(element));
    });

  };

  // Add toolbar.
  $("body").prepend('<div id="qipao-toolbar"><input id="qipao-property-name" type="text" placeholder="property name"></input><button class="new-button qipao-btn">New</button><button class="done-button qipao-btn">Done</button><button class="send-button qipao-btn">Send Data</button><div id="qipao-properties"><div>Saved Properties:</div><div id="qipao-properties-list"></div></div></div>');

  $('.new-button').click(function() {
    // Reset variables
    original = null;
    in_selection = null; // selector for items in group
    pattern = null; // potential siblings
    current_selector = null;
  });

  $('.done-button').click(function() {
    var property_name = $("#qipao-property-name").val();
    extracted_properties.push([property_name, in_selection]);
    $('.highlight-box').remove();
    $('[qipao-id]').removeAttr('qipao-id'); // need to remove qipao id from highlighted divs
    $('.qipao-selected-in').removeClass('qipao-selected-in');
    $('#qipao-property-name').val('');
    update_display();

    original = null;
    in_selection = null; // selector for items in group
    pattern = null; // potential siblings
    current_selector = null;
  });

  $('.send-button').click(function() {
    for (var i = 0; i < extracted_properties.length; i++) {
      var selector = create_jquery_selector(extracted_properties[i][1])
      var data = []
      $(selector).each(function() {
        data.push($.trim($(this).text()));
      });
      console.log('Property:', extracted_properties[i][0], 'Selector', selector);
      console.log(data.join('\n'));
    }
  });

  // Replace all links.
  $("a").each(function() {
    var link = $(this).attr('href');
    $(this).attr('qipaohref', link);
    $(this).removeAttr('href');
  });

  $("body *").not('#qipao-toolbar *').filter(function()
  {
    var $this = $(this);
    return $this.children().length == 0 && $.trim($this.text()).length > 0;
  })
  .hover(
    function() {
      $(this).addClass('qipaoify');
    }, function() {
      $(this).removeClass('qipaoify');
    }
  )
  .click(function() {
    $(this).off("click");
    $(this).off("hover");
    find_similar_tags($(this));
  });

// })()
