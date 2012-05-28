if (!window.location.href.match(/\/item\?/)) { // ignore if displaying a news item
    // initial setup
    if (localStorage['marked_read_urls']) {
        // cleanup
        marked_read_urls = JSON.parse(localStorage['marked_read_urls']);
        var now = (new Date()).getTime();

        // delete urls older than 4 days
        for (var url in marked_read_urls) {
            if (now - marked_read_urls[url] > 345600000) delete marked_read_urls[url];
        }
    } else {
        marked_read_urls = {};
    }

    localStorage['marked_read_urls'] = JSON.stringify(marked_read_urls);

    var titles = 0;
    var titles_marked = 0;
    var more_td = null;

    // hide or show the row depending on "hide read" status
    function hideShowRow(mainlink) {
        if (localStorage["hide_marked_urls"] == 'true') {
            var last = mainlink.parent().parent().hide().next().hide().next();
            if (!last.children("a")[0]) last.hide();
        } else mainlink.parent().parent().show().next().show().next().show();
    }

    // check which pieces of news have already been marked read and change their color
    $(".title").each(function(i,el) {
        var mainlink = $($(el).children("a")[0]);

        if (mainlink.text() == 'More') { // not new item, but the "more" link
            more_td = $(el);
        } else {
            titles++;

            // check if marked, and give the read color if it was marked
            if (marked_read_urls[mainlink.attr("href")]) {
                mainlink.css({color: "#828282"});
                titles_marked++;

                hideShowRow(mainlink);
            }
        }
    });

    // add the controls only in news listing pages
    if (titles > 29) {
        $($(".pagetop")[0]).append("&nbsp; <span class='mark_all_read' title='Mark all read'><img src='"+chrome.extension.getURL("/images/HNMarkAllRead-18.png")+"'></img></span>"+
            "<span id='hide_span'><input type='checkbox' id='hide_read_items' />Hide read</span>");
        if (localStorage["hide_marked_urls"] == 'true') $("#hide_read_items").attr("checked", true);

        if (more_td) more_td.append("&nbsp; <span class='mark_all_read near_more' title='Mark all read'><img src='"+chrome.extension.getURL("/images/HNMarkAllRead-18.png")+"'></img></span>");

        $(".mark_all_read").click(function(){
            $(".title").each(function(i,el) {
                var mainlink = $($(el).children("a")[0]);

                // add the link to the "read" ones
                if (!marked_read_urls[mainlink.attr("href")]) {
                    // add the url to the read ones
                    marked_read_urls[mainlink.attr("href")] = (new Date()).getTime();
                    localStorage['marked_read_urls'] = JSON.stringify(marked_read_urls);

                    // give the "read" color
                    mainlink.css({color: "#828282"});

                    hideShowRow(mainlink);
                }
            });
        });

        $("#hide_read_items").click(function() {
            localStorage["hide_marked_urls"] = !!$("#hide_read_items").attr("checked");

            $(".title").each(function(i,el) {
                var mainlink = $($(el).children("a")[0]);

                if (marked_read_urls[mainlink.attr("href")]) hideShowRow(mainlink);
            });
        });
    }
}

