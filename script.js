if (localStorage['followed_items']) {
    // cleanup
    followed_items = JSON.parse(localStorage['followed_items']);
    var now = (new Date()).getTime();

    // delete items older than 4 days
    for (var item_id in followed_items) {
        if (now - followed_items[item_id].time > 345600000) delete followed_items[item_id];
    }
} else {
    followed_items = {};
}

localStorage['followed_items'] = JSON.stringify(followed_items);

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
        if (localStorage["hide_marked_urls"] == 'true' && !mainlink.data("following")) {
            var last = mainlink.parent().parent().hide().next().hide().next();
            if (!last.children("a")[0]) last.hide();
        } else mainlink.parent().parent().show().next().show().next().show();
    }

    // check which pieces of news have already been marked read and change their color
    $(".subtext").each(function(i,sub) {
        var mainlink = $(sub.parentNode.previousSibling.childNodes[2].childNodes[0]);

        titles++;

        console.log(mainlink.html());

        // check if following
        var following = false;
        var comments_a = sub.childNodes[6];

        if (comments_a) { // if a real news item, and not just a yc announcement
            var item_id = comments_a.href.match(/[0-9]+/)[0];
            var comments = comments_a.innerText.match(/[0-9]+/) ? comments_a.innerText.match(/[0-9]+/)[0]*1 : 0;

            // if following, check the number of comments and highlight
            if (followed_items[item_id]) {
                following = true;

                mainlink.css({color: "#7070b0"});

                var unread_comments = comments - followed_items[item_id].read_comments;

                if (unread_comments > 0) {
                    $(comments_a).text("unread comments: "+unread_comments+"/"+comments).css({color: "green"});
                }

                mainlink.data("following", true);
            }
        }

        // check if marked, and give the read color if it was marked
        if (marked_read_urls[mainlink.attr("href")] && !following) {
            mainlink.css({color: "#828282"});
            titles_marked++;

            hideShowRow(mainlink);
        }


    });

    more_td = $(".title").last();
    if (more_td.text() != "More") more_td = null;

    // add the controls only in news listing pages
    if (titles > 29) {
        $($(".pagetop")[0]).append("&nbsp; <span class='mark_all_read' title='Mark all read'><img src='"+chrome.extension.getURL("/images/HNMarkAllRead-18.png")+"'></img></span>"+
            "<span id='hide_span' class='hide_news_span'><input type='checkbox' id='hide_read_items' /><label for='hide_read_items'>Hide read</label></span>");
        if (localStorage["hide_marked_urls"] == 'true') $("#hide_read_items").attr("checked", true);

        if (more_td) more_td.append("&nbsp; <span class='mark_all_read near_more' title='Mark all read'><img src='"+chrome.extension.getURL("/images/HNMarkAllRead-18.png")+"'></img></span>");

        $(".mark_all_read").click(function(){
            $(".title").each(function(i,el) {
                var mainlink = $($(el).children("a")[0]);

                // add the link to the "read" ones
                if (!marked_read_urls[mainlink.attr("href")]) {
                    // add the url to the read ones
                    marked_read_urls[mainlink.attr("href")] = (new Date()).getTime();

                    // give the "read" color
                    mainlink.css({color: "#828282"});

                    hideShowRow(mainlink);
                }
            });

            localStorage['marked_read_urls'] = JSON.stringify(marked_read_urls);
        });

        $("#hide_read_items").click(function() {
            localStorage["hide_marked_urls"] = !!$("#hide_read_items").attr("checked");

            $(".title").each(function(i,el) {
                var mainlink = $($(el).children("a")[0]);

                if (marked_read_urls[mainlink.attr("href")]) hideShowRow(mainlink);
            });
        });
    }
} else { // comments page
    // initial setup for read comments
    if (localStorage['marked_read_comments']) {
        // cleanup
        marked_read_comments = JSON.parse(localStorage['marked_read_comments']);
        var now = (new Date()).getTime();

        // delete data older than 4 days
        for (var comment in marked_read_comments) {
            if (now - marked_read_comments[comment] > 345600000) delete marked_read_comments[comment];
        }
    } else {
        marked_read_comments = {};
    }

    localStorage['marked_read_comments'] = JSON.stringify(marked_read_comments);

    // comments traversing
    var ii = $("img");
    var parents = [];
    var last_depth = 0;
    var last_node = null;
    var first_child = false;
    var comments_unread = 0;
    var comments_total = 0;
    var collapsible_parents = {};

    var comments_counter = $($(".subtext").children("a")[2]);

    $($(".subtext")[0]).append("&nbsp; <span class='mark_all_read' title='Mark all comments read'><img src='"+chrome.extension.getURL("/images/HNMarkAllRead-18.png")+"'></img></span>"+
            "<span id='hide_span' class='hide_comments_span'><input type='checkbox' id='hide_read_items' /><label for='hide_read_items'>Hide read comments</label></span>");

    $("<tr><td id='post_comments_tr'></td></tr>").insertAfter($($("table")[0].childNodes[0].childNodes[2]));
    $(".mark_all_read").clone().appendTo($("#post_comments_tr"));

    $($("table")[2].nextSibling.nextSibling).replaceWith("<div id='expand_collapse_top'>"+
            "<span id='collapse_all' class='clickable' title='collapse all comments'>--</span>"+
            "&nbsp;&nbsp;"+
            "<span id='expand_all' class='clickable' title='expand all comments'>++</span>"+
            "&nbsp;&nbsp;"+
            "<span id='follow_span'><input type='checkbox' id='follow_item' title='Follow the comments for this item from the first page' />Follow comments</span>"+
        "</div>"
    );

    $('body').append("<div id='parent_div'><table><tr id='parent_tr'></tr></table></div>");

    // create an accessible stylesheet
    $("<style></style>").appendTo(document.body);

    var sheet = document.styleSheets[document.styleSheets.length-1];

    for (i=0;i<ii.length;i++) {
        var n = ii[i];
        try {
            if (n.parentNode.tagName =='TD' && n.src == 'http://ycombinator.com/images/s.gif' && n.parentNode && n.parentNode.nextSibling) {
                comments_total++;
                var node = n.parentNode.nextSibling.nextSibling; // the comment td

                // read/unread comments management
                var comment_id = node.childNodes[0].childNodes[0].childNodes[2].href.match(/[0-9]+/)[0];

                var tr = node.parentNode.parentNode.parentNode.parentNode.parentNode;

                $(tr).data("comment_id", comment_id).addClass("comment_tr_"+comment_id);
                $(node).data("comment_id", comment_id).addClass("comment_td_"+comment_id);

                // check if marked, and give the read color if it was marked
                if (marked_read_comments[comment_id]) {
                    $(tr).addClass("read_comment_tr");
                    $(node).addClass("read_comment_td");

                } else {
                    $(tr).addClass("unread_comment_tr");
                    $(node).addClass("unread_comment_td");
                    comments_unread++;
                }

                // nesting management
                var depth = n.width/40;
                if (depth > last_depth) {
                    parents.push(last_node);
                    first_child = true;
                } else
                {
                    first_child = false;

                    if (depth < last_depth) {
                        for (j=0;j<last_depth-depth;j++) parents.pop();
                    }
                }

                if (parents.length > 0) {
                    var parent = parents[parents.length-1];

                    $("<span"+(first_child ? " class='showparent_firstchild'" : "")+"> | <span class='showparent'>show parent</span></span>").appendTo($($(node).children()[0]).children(".comhead")).
                        children(".showparent").
                        hover(
                        (function(parent, node){ return function() {
                            $("#parent_tr").append(parent.clone());
                            node.css({position: "relative"}).append(
                                $("#parent_div").show()
                            );

                        }})($(parent), $(node)),
                        (function(parent, node){ return function() {
                            $("#parent_tr").html("");
                            $("#parent_div").hide();
                        }})($(parent, $(node)))
                    );
                }

                // for collapsing
                for (var k=0;k<parents.length;k++) {
                    var id = $(parents[k]).data("comment_id");
                    $(tr).addClass("descends_from_"+id);
                    collapsible_parents[id] = parents[k];
                }

                last_node = node;
                last_depth = depth;
            }
        } catch(e) {
            console.log(e);
        }
    }

    $(".mark_all_read").click(function(){
        $(".unread_comment_td").each(function(i,el) {
            var sel = $(el);

            var comment_id = sel.data("comment_id");

            marked_read_comments[comment_id] = (new Date()).getTime();

            sel.removeClass("unread_comment_td").addClass("read_comment_td");

            var tr = $(el.parentNode.parentNode.parentNode.parentNode.parentNode);

            tr.removeClass("unread_comment_tr").addClass("read_comment_tr");

            comments_unread = 0;
            if (followed_items[item_id]) {
                followed_items[item_id].read_comments = comments_total;

                localStorage['followed_items'] = JSON.stringify(followed_items);
            }
        });

        localStorage['marked_read_comments'] = JSON.stringify(marked_read_comments);

        comments_counter.text("unread comments: 0/"+comments_total);
    });

    /////////////////////////////////
    // following this item

    var item_id = window.location.href.match(/[0-9]+/)[0];
    if (followed_items[item_id]) {
        $("#follow_item").attr("checked", true);
    }

    $("#follow_item").click(function(){
        if ($("#follow_item").attr("checked")) {
            followed_items[item_id] = {
                time: (new Date()).getTime(),
                read_comments: comments_total - comments_unread
            };
        } else {
            delete followed_items[item_id];
        }

        localStorage['followed_items'] = JSON.stringify(followed_items);
    });

    /////////////////////////////////
    // hiding marked comments

    if (localStorage["hide_marked_comments"] == 'true') {
        $("#hide_read_items").attr("checked", true);
        hideMarkedComments(true);
    } else {
        hideMarkedComments(false);
    }

    function hideMarkedComments(val) {
        if (val) {
            addCssRule(".read_comment_tr {display: none;}");
            deleteCssRule(".showparent_firstchild");
        } else {
            addCssRule(".showparent_firstchild {display: none;}");
            deleteCssRule(".read_comment_tr");
        }
    }

    $("#hide_read_items").click(function() {
        localStorage["hide_marked_comments"] = !!$("#hide_read_items").attr("checked");

        hideMarkedComments($("#hide_read_items").attr("checked"));
    });

    comments_counter.text("unread comments: "+comments_unread+"/"+comments_total);

    //////////////////////////////////
    // comments collapsing

    // set collapsible comments up
    for (var id in collapsible_parents) {
        var parent = $(collapsible_parents[id]);

        parent.addClass("collapsible_comment");

        $("<div class='comment_collapse' title='expand/collapse'>-</div>").appendTo(parent).click((function(id) { return function(){ // toggle collapse
            setCollapsed(id, !$(".comment_tr_"+id).data("collapsed"));
        }; })(id));
    }

    $("#collapse_all").click(function(){
        $(".collapsible_comment").each(function(i,el){
           setCollapsed($(el).data("comment_id"),true);
        });
    });

    $("#expand_all").click(function(){
        $(".collapsible_comment").each(function(i,el){
            setCollapsed($(el).data("comment_id"),false);
        });
    });

    function setCollapsed(id, collapse) {
        var tr = $(".comment_tr_"+id);
        var td = $(".comment_td_"+id);

        if (collapse){
            addCssRule(".descends_from_"+id+" {display: none;}");

            tr.data("collapsed",true);
            td.addClass("collapsible_collapsed");
            td.children(".comment_collapse").text("+");
        } else {
            deleteCssRule(".descends_from_"+id);

            tr.data("collapsed", false);
            td.removeClass("collapsible_collapsed");
            td.children(".comment_collapse").text("-");
        }
    }

    /////////////////////////////
    // utilities

    function addCssRule(rule) {
        sheet.insertRule(rule, sheet.cssRules.length)
    }

    function deleteCssRule(selector) {
        for (var i=0;i<sheet.cssRules.length;i++) {
            if (sheet.cssRules[i].selectorText == selector) {
                sheet.deleteRule(i);
            }
        }
    }
}


