(function() {

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
        if (i < pattern.length) {
          console.log('within pattern')
          // If i is less than length of pattern, only index could have been
          // mismatched.
          pattern[i][1] = original[i][1];
        } else if (original[i][0] != out_selection[i][0]) {
          // If i is greater than length of pattern and tags are mismatched,
          // add tags from length of pattern to i.
          console.log('greater than pattern tag mismatch');
          for (var j = pattern.length; j <= i; j++) {
            pattern.push([original[j][0], null]);
          }
        } else if (original[i][1] != out_selection[i][1]) {
          // If i is greater than length of pattern and indices are mismatched,
          // add tags from length of pattern to i and add index for i.
          // Indices are mismatched.
          console.log('greater than pattern index mismatch')
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
      // TODO(lydia): why would tag names not match?
      // if (original[i][0] != out_selection[i][0] ||
      // original[i][1] != out_selection[i][1]) {
      if (original[i][0] != out_selection[i][0]) {
        in_selection = in_selection.slice(0, i);
        break;
      }
      else if (original[i][1] != out_selection[i][1]) {
        // If i is less than length of pattern, remove index.
        in_selection[i][1] = null;
        // break;
      }
    }
    var selector = create_jquery_selector(in_selection);
    console.log('new selector', selector);
    $(selector).removeClass('qipao-selected')
      .each(function() {
        // Hide accept/reject boxes.
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
      if ($(this).prop("tagName") !== 'HTML') {
        tags.push([$(this).prop("tagName"), $(this).index()]);
      }
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
    in_selection = original.slice(0,6);
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

  ///////// Code Written for Hackathon /////////
  var clusterMaxDist = 100;

  var cluster = function(items) {
    var clusters = [[items[0]]];
    for (var i=1; i < items.length; i++) {
      var added = false;
      for (var j=0; j < clusters.length; j++) {
        if (Math.abs(items[i][0] - clusters[j][0][0]) < clusterMaxDist) {
          added = true;
          clusters[j].push(items[i]);
          break;
        }
      }
      if (!added) {
        // create new cluster with item;
        clusters.push([items[i]]);
      }
    }
    return clusters;
  }

  var getBiggestCluster = function(clusters) {
    var clusterSizes = [];
    clusters.forEach(function(cluster) {
      clusterSizes.push(cluster.length);
    });
    var max = Math.max.apply(null, clusterSizes);
    var index = clusterSizes.indexOf(max);
    return clusters[index];
  }

  var clusterElements = function(elements) {
    // Navs are usually aligned either by x or y axis.
    var elementsWithOffset = [];
    elements.forEach(function(element) {
      var offset = $(element).offset();
      elementsWithOffset.push([offset.top, offset.left, element])
    });

    // Cluster by height
    var heights = [];
    elementsWithOffset.forEach(function(val) {
      heights.push([val[0], val[2]]);
    });
    var clustersByHeight = cluster(heights);
    // console.log('cluster by height', clustersByHeight)

    // Cluster by width
    var widths = [];
    elementsWithOffset.forEach(function(val) {
      widths.push([val[1], val[2]]);
    });
    var clustersByWidth = cluster(widths);
    // console.log('cluster by width', clustersByWidth)

    return getBiggestCluster(clustersByWidth.concat(clustersByHeight));
  };

  var create_jquery_selector_with_class = function(descriptors) {
    // Create jquery selector using tag, index (optional), class
    // name (optional) and visible selector.
    var selector = [];
    for (var i = descriptors.length - 1; i >= 0; i--) {
      var subSelector = descriptors[i][0];
      if (descriptors[i][1] != null) {
        // nth-child() selector is 1-indexed.
        subSelector += ':nth-child(' + (descriptors[i][1] + 1) + ')';
      }
      if (descriptors[i][2]) {
        subSelector += '.' + descriptors[i][2];
      }
      subSelector += ':visible'; // filter for visible elements
      selector.push(subSelector);
    }
    // Each tag must be direct child of previous tag.
    return selector.join(' > ');
  };

  var get_selector_list_with_class = function(element) {
    // Returns list of (tagName, index, class) for element and all its parents.
    var tags = []
    tagName = element.prop("tagName");
    element.parents().each(function() {
      if ($(this).prop("tagName") !== 'HTML') {
        var classes = $(this).attr('class');
        if (classes === undefined) {
          classes = '';
        }
        tags.push([$(this).prop("tagName"), $(this).index(),
                   classes.split(' ')[0]]);
      }
    });
    tags.unshift([tagName, element.index()]);
    return tags;
  };

  var getText = function(element) {
    var text = $(element).text();
    text = text.replace(/\n/g,'');
    text = $.trim(text);
    // console.log('text', text);
    return text;
  }

  var find_nav = function(element) {
    var pageHeight = $(document).height();
    var used_selectors = {};
    $('a').each(function() {
      var tags = get_selector_list_with_class($(this));
      original = tags.slice(0);

      // By default, start with 4 levels.
      pattern = [];
      var max_levels = Math.min(original.length, 4);
      for (var i = 0; i < max_levels; i++) {
        if (original[i][0] === 'UL') {
          // add index and class
          pattern.push([original[i][0], original[i][1], original[i][2]]);
        } else if (original[i][0] === 'LI') {
          pattern.push([original[i][0], null, null]);
        } else {
          pattern.push([original[i][0], null, original[i][2]]);  // add class
        }
      }
      current_selector = create_jquery_selector_with_class(pattern);

      // Don't repeat selectors.
      if (used_selectors[current_selector] !== undefined) {
        return;
      } else {
        used_selectors[current_selector] = 1;
      }
      // console.log('selector', current_selector);

      // Print itself and siblings.
      var found = $(current_selector);
      // console.log('found', found);
      if (!found.length) {
        return;
      }

      // Remove elements that don't contain text, or contain only numbers.
      var titles = [];
      var filteredFound = [];
      found.each(function(index, element) {
        // TODO(lydia): Element itself might not be hidden. Parent might
        // be hidden. Also nested navs are hidden.
        // if ($(element).css('display') === 'none') {
        //   // check for hidden elements. skip if hidden
        //   // what about nested navs?
        //   return;
        // }
        var text = getText(element);
        if (text.length > 0 && isNaN(parseInt(text))) {
          if (titles.indexOf(text) === -1) {
            titles.push(text);
            filteredFound.push(element);
          }
        }
      });

      // Cluster elements by height and width;
      var cluster = clusterElements(filteredFound);
      titles = [];
      cluster.forEach(function(element) {
        titles.push(getText(element));
      });

      // Skip if less than 3 unique titles.
      if (titles.length <= 2) {
        return;
      }

      // Check position of found elements.
      var position = $(filteredFound[0]).offset();
      if (position.top < 300) {
        console.log('header');
        console.log('nav', titles);
      } else if (position.top > pageHeight - 300) {
        console.log('footer');
        console.log('nav', titles);
      }

    });
  };

  var findCommonAncestor = function(ele, ele2) {
    var parents = $(ele).parents();
    var parents2 = $(ele2).parents();
    var i = 0;
    while (parents.get(i) != parents2.get(i)) {
      i++;
      if (i > parents.length || i > parents2.length || i > 5) {
        break;
      }
    }
    if (parents.get(i) == parents2.get(i)) {
      return parents.get(i);
    } else {
      return null;
    }
  };

  var isAncestor = function(ancestor, ele) {
    if (ancestor == ele) {
      return false;
    }
    var parents = $(ele).parents();
    var i = 0;
    while (i < parents.length) {
      if (parents.get(i) == ancestor) {
        return true;
      }
      i++;
    }
    return false;
  };

  var findDirectChildContainingElement = function(ancestor, ele) {
    // Find direct child of `ancestor` that contains ele.
    var parents = $(ele).parents();
    var child = ele;
    if (!isAncestor(ancestor, ele)) {
      return null;
    }
    while ($(child).parent()[0] != ancestor) {
      child = $(child).parent()[0];
    }
    return child;
  };

  var getData = function(ele, div) {
    // TODO(lydia): Get more context for text, etc. to use in classification.
    if (ele.tagName == 'IMG') {
      var src = $(ele).attr('src');
      // console.log($(ele).attr('src'));
      div.append('<img src="' + src + '">');
    } else {
      var imgs = $(ele).find('img');
      imgs.each(function(i, e) {
        var src = $(e).attr('src');
        div.append('<img src="' + src + '">');
        // console.log($(e).attr('src'));
      });
    }
    // console.log($(ele).text());
    div.append('<div>' + $(ele).text() + '</div>');
  };

  var groupByAncestor = function (feature, found) {
    // Compare all pairs in `found`, find common ancestor. `common` is a list
    // of tuple of ancestor and direct children containing members of  `found`.
    // ex. [[ancestor, [child1, child22]], [ancestor2, [child3, child4]]]
    var common = [];
    for (var i = 0; i < found.length - 1; i++) {
      var ele = found[i].element;
      var ele2;
      for (var j = i + 1; j < found.length; j++) {
        ele2 = found[j].element;
        var ancestor = findCommonAncestor(ele, ele2);
        if (!ancestor) {
          continue;
        }
        var branch1 = findDirectChildContainingElement(ancestor, ele);
        var branch2 = findDirectChildContainingElement(ancestor, ele2);
        var added = false;
        for (var k = 0; k < common.length; k++) {
          if (common[k][0] == ancestor) {
            // Ancestors match, add branches to list.
            if (common[k][1].indexOf(branch1) === -1) {
              common[k][1].push(branch1);
            }
            if (common[k][1].indexOf(branch2) === -1) {
              common[k][1].push(branch2);
            }
            added = true;
          }
        }
        if (!added) {
          var newGrouping = [ancestor, [branch1]];
          if (branch1 != branch2) {
            newGrouping[1].push(branch2);
          }
          common.push(newGrouping);
        }
      }
    }
    return common;
  }

  var findPatterns = function() {
    var used_selectors = {};
    var images = $('img');
    images.each(function() {
      var tags = get_selector_list_with_class($(this));
      original = tags.slice(0);

      // By default, start with 4 levels.
      pattern = [];
      var max_levels = Math.min(original.length, 4);
      for (var i = 0; i < max_levels; i++) {
        if (original[i][0] === 'UL') {
          // add index and class
          pattern.push([original[i][0], original[i][1], original[i][2]]);
        } else if (original[i][0] === 'LI') {
          pattern.push([original[i][0], null, null]);
        } else {
          pattern.push([original[i][0], null, original[i][2]]);  // add class
        }
      }
      current_selector = create_jquery_selector_with_class(pattern);

      // Don't repeat selectors.
      if (used_selectors[current_selector] !== undefined) {
        return;
      } else {
        used_selectors[current_selector] = 1;
      }
      // console.log('selector', current_selector);

      var found = $(current_selector);
      // console.log('found', found);
      if (!found.length) {
        return;
      }

      // Compare all pairs in `found`, find common ancestor. `common` is a list
      // of tuple of ancestor and members of `found` with that ancestor.
      // ex. [[ancestor, [ele1, ele2]], [ancestor2, [ele3, ele4]]]
      var common = [];
      for (var i = 0; i < found.length - 1; i++) {
        var ele = found.get(i);
        var ele2;
        for (var j = i + 1; j < found.length; j++) {
          ele2 = found.get(j);
          var ancestor = findCommonAncestor(ele, ele2);
          if (!ancestor) {
            continue;
          }
          var added = false;
          for (var k = 0; k < common.length; k++) {
            if (common[k][0] == ancestor) {
              // Ancestors match, add elements to list.
              if (common[k][1].indexOf(ele) === -1) {
                common[k][1].push(ele);
              }
              if (common[k][1].indexOf(ele2) === -1) {
                common[k][1].push(ele2);
              }
              added = true;
            }
            if (isAncestor(common[k][0], ele)) {
              // Add to list if is ancestor of ele.
              if (common[k][1].indexOf(ele) === -1) {
                common[k][1].push(ele);
              }
            }
            if (isAncestor(common[k][0], ele2)) {
              // Add to list if is ancestor of ele.
              if (common[k][1].indexOf(ele2) === -1) {
                common[k][1].push(ele2);
              }
            }
          }
          if (!added) {
            common.push([ancestor, [ele, ele2]]);
          }
        }
      }

      for (var i = 0; i < common.length; i++) {
        console.log(common[i]);
        var ancestor = common[i][0];
        var children = [];
        common[i][1].forEach(function(ele) {
          // Go over each element which has ancestor as ancestor.
          var child = ele;
          var i = 0;
          while ($(child).parent()[0] != ancestor && i < 10) {
            child = $(child).parent()[0];
            i++;
          }
          if (children.indexOf(child) !== -1) {
            return;
          }
          // console.log(child);
          children.push(child);
          // TODO(lydia): Get more context for text, etc. to use in
          // classification.
          if (child.tagName == 'IMG') {
            // console.log($(child).attr('src'));
          } else {
            var imgs = $(child).find('img');
            imgs.each(function(i, e) {
              // console.log($(e).attr('src'))
            });
          }
          // console.log($(child).text());
        });
      }
    });
  };

  var getFeatures = function(ele) {
    var features = [];
    if ($(ele).parents().length) {
      var parent = $(ele).parents().get(0);
      features.push(parent.tagName);
      if ($(parent).attr('class') && parent.tagName === 'DIV') {
        // TODO(lydia): Only add classes for DIV tags.
        features.push($(parent).attr('class'));
      }
    } else {
      features.push(null);
    }
    features.push(ele.tagName);
    if ($(ele).attr('class') && ele.tagName === 'DIV') {
      features.push($(ele).attr('class'));
    }
    var childrenTags = [];
    $(ele).children().each(function(index, e) {
      if (e.tagName === 'SCRIPT' || e.tagName === 'NOSCRIPT') {
        return;
      }
      var cTags = [];
      // add children tags.
      $(e).children().each(function(i, e2) {
        if (cTags.indexOf(e2.tagName) === -1 && e2.tagName !== 'SCRIPT') {
          cTags.push(e2.tagName);
        }
      });
      var tag = e.tagName + ' ' + cTags.join(' ');
      if (childrenTags.indexOf(tag) === -1) {
        childrenTags.push(tag);
      }
    });
    features = features.concat(childrenTags);
    return features.join(' ');
  };

  var buildTree = function(root) {
    root.children =  [];
    $(root.element).children().each(function(index, ele) {
      if (ele.tagName !== 'SCRIPT' && ele.tagName !== 'NOSCRIPT') {
        var node = {
          element: ele,
          features: getFeatures(ele)
        };
        buildTree(node);
        root.children.push(node);
      }
    });
  };

  var clusterNodes = function(node, dictionary) {
    // Cluster nodes by exact match for now.
    if (dictionary[node.features] == undefined) {
      dictionary[node.features] = [];
    }
    dictionary[node.features].push(node);
    node.children.forEach(function(child) {
      clusterNodes(child, dictionary);
    });
  };

  var pruneCluster = function(cluster) {
    // Prune clusters that don't have images or less than 2 in size.
    var toDelete = [];
    Object.keys(cluster).forEach(function(val) {
      if (val.indexOf('IMG') === -1 || cluster[val].length <= 1) {
        toDelete.push(val);
      }
    });
    toDelete.forEach(function(val) {
      delete cluster[val];
    });
  };

  var intersection = function(a, b) {
    var c = [];
    for (var i = 0; i < a.length; i++) {
      if (b.indexOf(a[i]) !== -1) {
        c.push(a[i]);
      }
    }
    return c;
  };

  var union = function(a, b) {
    var c = a;
    for (var i = 0; i < b.length; i++) {
      if (c.indexOf(b[i]) === -1) {
        c.push(b[i]);
      }
    }
    return c;
  };

  var addToTree = function(root, node) {
    var added = false;
    root.children.forEach(function(val) {
      if (isAncestor(val.element, node.element)) {
        addToTree(val, node);
        added = true;
      }
    });
    if (!added) {
      root.children.push(node);
    }
  };

  var createHierarchy = function(cluster) {
    var common = [];
    Object.keys(cluster).forEach(function(val) {
      var c = groupByAncestor(val, cluster[val]);
      common = common.concat(c);
    });

    var deduped = [];
    // Remove duplicates.
    for (var i = 0; i < common.length; i++) {
      var ancestor = common[i][0];
      var hasAncestor = false;
      for (var j = 0; j < deduped.length; j++) {
        var current = deduped[j];
        if (ancestor == current[0]) {
          var hasGroup = false;
          hasAncestor = true;
          for (var k = 0; k < current[1].length; k++) {
            if (intersection(current[1][k], common[i][1]).length > 0) {
              // If there is overlap, add to group.
              current[1][k] = union(current[1][k], common[i][1]);
              hasGroup = true;
              break;
            }
          }
          if (!hasGroup) {
            current[1].push(common[i][1]);
          }
          break;
        }
      }
      if (!hasAncestor) {
        deduped.push([ancestor, [common[i][1]]]);
      }
    }
    console.log(deduped);

    // Rearrange into a hierarchy.
    var roots = [];
    for (var i = 0; i < deduped.length; i++) {
      var node = {element: deduped[i][0], children: [], members: deduped[i][1]};
      var added = false;
      for (var j = 0; j < roots.length; j++) {
        if (isAncestor(roots[j].element, node.element)) {
          addToTree(roots[j], node);
          added = true;
          break;
        } else if (isAncestor(node.element, roots[j].element)) {
          addToTree(node, roots[j]);
          roots[j] = node;
          added = true;
          break;
        }
      }
      if (!added) {
        roots.push(node);
      }
    }
    console.log(roots);

    return roots;
  };

  var extractTree = function(node, i, div) {
    // console.log('LEVEL', i, node.element);
    if (node.children.length === 0) {
      node.members.forEach(function(val) {
        // console.log('GROUPING');
        div.append($("<h1>New Group</h1>"));
        var container = $("<div class='demogroup'></div>");
        val.forEach(function(v) {
          var itemc = $("<div class='demoitem'></div>");
          container.append(itemc);
          getData(v, itemc);
        });
        div.append(container);
        div.append($("<div style='clear:both;'></div>"));
      });
    } else {
      node.children.forEach(function(val) {
        extractTree(val, i+1, div);
      });
    }
  };

  var extractData = function(hierarchy, div) {
    for (var i = 0; i < hierarchy.length; i++) {
      extractTree(hierarchy[i], 0, div);
    }
  };
  ///////// Code Written for Hackathon /////////


  ////////////
  // Set up //
  ////////////
  // Add toolbar.
  // $("body").prepend('<div id="qipao-toolbar"><input id="qipao-property-name" type="text" placeholder="property name"></input><button class="new-button qipao-btn">New</button><button class="done-button qipao-btn">Done</button><button class="send-button qipao-btn">Send Data</button><div id="qipao-properties"><div>Saved Properties:</div><div id="qipao-properties-list"></div></div></div>');

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

  // Replace all links so you can select links without navigating to the linked
  // url.
  $("a").each(function() {
    var link = $(this).attr('href');
    $(this).attr('qipaohref', link);
    $(this).removeAttr('href');
  });

  // Find all text elements, add add ability to highlight/select them.
  $("body *").not('#qipao-toolbar *')
    .filter(function() {
      var $this = $(this);
      // TODO(lydia): How do we handle <p>'s that have <br> or <a> or other
      // tags in them?
      // return $this.children().length == 0 && $.trim($this.text()).length > 0;
      return $.trim($this.text()).length > 0 && (
        $this.prop("tagName") === 'P' || $this.children().length == 0);
    })
    .hover(
      function() {
        $(this).addClass('qipaoify');
      }, function() {
        $(this).removeClass('qipaoify');
      }
    )
    .click(function() {
      // TODO(lydia): Remove hover from all elements? Because why should it
      // still show qipaoify highlight when you're in find similar tag state?
      $(this).off("click");
      $(this).off("hover");
      find_similar_tags($(this));
    });

  ///////// Code Written for Hackathon /////////
  find_nav();
  // findPatterns();
  var body = $('body').get(0);
  var root = {element: body, features: getFeatures(body)}
  buildTree(root);
  var clusters = {};
  clusterNodes(root, clusters);
  pruneCluster(clusters);
  var hierarchy = createHierarchy(clusters);

  var div = $('<div id="qipao-toolbar"></div>');
  extractData(hierarchy, div);
  $("body").prepend(div);
  ///////// Code Written for Hackathon /////////

})()
