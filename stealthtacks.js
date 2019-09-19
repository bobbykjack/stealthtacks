window.pinboard = {
    Elements: [],
    data: {
        posts: [],
        tags: [],
        updateTime: "",
        token: ""
    }
};

locateElements();
loadDataFromLocalStorage();
setup();
start();

/**
 * Store a reference to each element in the document that has an ID attribute.
 */
function locateElements() {
    var elements = document.querySelectorAll("[id]"),
        index;

    for (index = 0; index < elements.length; index++) {
        window.pinboard.Elements[elements[index].id] = elements[index];
    }
}

/**
 * Load data from local storage into memory
 */
function loadDataFromLocalStorage() {
    var data;

    if (data = JSON.parse(localStorage.getItem("data"))) {
        window.pinboard.data = data;
    }
}

/**
 * Set up various event handlers
 */
function setup() {
    var els = window.pinboard.Elements;

    els["maininput"].addEventListener("input", function(ev) {
        search(window.pinboard.Elements["maininput"].value);
    });

    els["form-input"].addEventListener("submit", submitMainForm);

    els["posts"].addEventListener("click", function(ev) {
        var href;

        if (ev.target.classList.contains("edit")) {
            href = ev.target.parentNode.getAttribute("href");
            updatePostForm(href, showPostForm);
            ev.preventDefault();
        }
    });

    els["tags"].addEventListener("click", function(ev) {
        var posts = window.pinboard.data.posts;
        displayPosts(posts.filter(postsWithTag(ev.target.textContent)));
        ev.preventDefault();
    });

    els["cancel-post"].addEventListener("click", function(ev) {
        closePostForm();
        ev.preventDefault();
    });

    els["save-post"].addEventListener("click", function(ev) {
        savePostForm();
        ev.preventDefault();
    });

    els["fetch-post"].addEventListener("click", fetchPostRemote);
    document.addEventListener("keydown", handleKeyDown);
    setupAuthForm();
}

/**
 * Handle submission of main form — either start adding a new post, if a url is
 * submitted, or visit the url of the first displayed post, if there is one.
 *
 * @param {Event} ev The event that triggered submission
 *
 * @todo Rename This!!!
 */
function submitMainForm(ev) {
    var val = window.pinboard.Elements["maininput"].value,
        firstPost;

    ev.preventDefault();

    if (isUrl(val)) {
        hideMainInput();
        updatePostForm(val, showPostForm);
    } else {
        if (firstPost = document.querySelector("#posts a:first-child")) {
            window.location = firstPost.href;
        } else {
// todo could 'flash' the input to alert that nothing's happened
            var mi = window.pinboard.Elements["maininput"];
            mi.style.backgroundColor = "#495057";
            mi.style.color = "rgb(255, 255, 255)";

            setTimeout(function() {
                var mi = window.pinboard.Elements["maininput"];
                mi.style.backgroundColor = "";
                mi.style.color = "";
            }, 125);
        }
    }
}

/**
 * Fetch the URL from the current post, ...
 *
 * @param {Event} ev The event that triggered this call
 */
function fetchPostRemote(ev) {
    var els = window.pinboard.Elements;

    if (els["post-url"].value) {
        els["fetch-post"].setAttribute("disabled", "disabled");
        els["fetch-post"].innerHTML = "Fetching…";

        fetchRemoteUrl(
            window.pinboard.Elements["post-url"].value,
            function() {
                els["fetch-post"].innerHTML = "Fetch";
                els["fetch-post"].removeAttribute("disabled");
            }
        );
    }

    ev.preventDefault();
}

/**
 * Respond to key press on main document
 *
 * @param {Event} ev The event that triggered this call
 *
 * @todo support for an 'edit post' key
 */
function handleKeyDown(ev) {
    var els = window.pinboard.Elements;

    if (ev.keyCode == 27) {
        handleEscapeKey();
    } else if (els["posts"].style.display == "block") {
        if (ev.keyCode == 38) {
            handleCursorUp();
            ev.preventDefault();
        } else if (ev.keyCode == 40) {
            handleCursorDown();
            ev.preventDefault();
        } else if (ev.keyCode == 39) {
            handleCursorRight();
            ev.preventDefault();
        }
    } else if (ev.keyCode == 37) {
        handleCursorLeft();
        ev.preventDefault();
    }
}

/**
 * Handle a key press of the ESCAPE key
 */
function handleEscapeKey() {
    var els = window.pinboard.Elements,
        posts;

    if (els["form-post"].style.display == "block") {
        closePostForm();
    } else if (document.activeElement == els["maininput"]) {
        clearMainInput();
        clearTagList();
        posts = window.pinboard.data.posts;
        displayPosts(posts);
    }

    els["maininput"].focus();
}

/**
 * Handle a key press of the DOWN cursor key
 */
function handleCursorDown() {
    var el = document.activeElement;

    if (el.tagName.toLowerCase() == "a" && el.nextElementSibling) {
        el.nextElementSibling.focus();
    }
}

/**
 * Handle a key press of the UP cursor key
 */
function handleCursorUp() {
    var el = document.activeElement;

    if (el.tagName.toLowerCase() == "a" && el.previousElementSibling) {
        el.previousElementSibling.focus();
    }
}

/**
 * Handle a key press of the RIGHT cursor key
 */
function handleCursorRight() {
    var el = document.activeElement;

    if (el.tagName.toLowerCase() == "a") {
        href = el.getAttribute("href");
        updatePostForm(href, showPostForm);
    }
}

/**
 * Handle a key press of the LEFT cursor key
 */
function handleCursorLeft() {
    var els = window.pinboard.Elements;

    if (els["form-post"].style.display == "block") {
        closePostForm();
    }
}

/**
 * Get a function to match posts with a given tag
 *
 * @param {String} tag The tag to match
 *
 * @returns {Function}
 */
function postsWithTag(tag) {
    return function(a) {
        return a.tags.indexOf(tag) !== -1;
    }
}

/**
 * Close the post form and revert to default view
 */
function closePostForm() {
    hidePostForm();
    showMainInput();
    showPostList();
    showTagList();
}

/**
 * Create / Update a post via the Pinboard API.
 *
 * @todo reduce size of this function
 * @todo Handle 404 from API
 */
function savePostForm() {
    var url = window.pinboard.Elements["post-url"].value,
        post = {
            "url": url,
            "description": window.pinboard.Elements["post-title"].value,
            "extended": window.pinboard.Elements["post-desc"].value,
            "tags": window.pinboard.Elements["post-tags"].value,
        },
        found = false,
        old_tags = [],
        idx;

    apiCall(window.pinboard.data.token, "posts/add", function() {
        var res;

        if (this.status == 404) {
            //undoPostAdd(post.url);
            return;
        }

        res = JSON.parse(this.responseText);

        if (res.hasOwnProperty("error")) {
            if (res.error == "bad auth") {
                showAuthDialog("Bad auth", "danger");
            }
        } else {
            saveData();
            window.pinboard.data.updateTime = (new Date()).toISOString();
        }
    }, post);

    post.href = post.url;
    post.time = (new Date()).toISOString();
    post.tags = post.tags.split(" ");

    delete post.url;

// look for url
    for (idx in window.pinboard.data.posts) {
        if (window.pinboard.data.posts[idx].href == url) {
            found = true;
            old_tags = window.pinboard.data.posts[idx].tags;
            window.pinboard.data.posts[idx] = post;
            break;
        }
    }

    if (!found) {
        window.pinboard.data.posts.unshift(post);
    }

// Handle tags. Note, this isn't perfect since we could delete the only usage
// of a given tag, but it will still hang around in memory until we refresh the
// tag list from Pinboard.

// Remove old tags
    for (idx = 0; idx < old_tags.length; idx++) {
        if ((pos = window.pinboard.data.tags.indexOf(old_tags[idx])) !== -1) {
            old_tags.splice(pos, 1);
        }
    }

// Add new tags
    for (idx = 0; idx < post.tags.length; idx++) {
        if (window.pinboard.data.tags.indexOf(post.tags[idx]) === -1) {
            window.pinboard.data.tags.push(post.tags[idx]);
        }
    }

    window.pinboard.data.tags.sort();

    displayPosts(window.pinboard.data.posts);
    closePostForm();
    clearPostForm();
    clearMainInput();
}

/**
 * Clear value of main input
 */
function clearMainInput() {
    window.pinboard.Elements["maininput"].value = "";
}

/**
 * Update the main button text based on what action will be carried out in
 * response to the contents of the main text input.
 *
 * @param {Event} ev
 */
function updateButton(ev) {
    var val = ev.target.value;
    
    window.pinboard.Elements.mainbtn.innerText =
        isUrl(val) ? "Add url" : val.length ? "Search" : "See all";
}

/**
 * Determine if input string looks like a URL
 *
 * @param {String} str Input string to match
 *
 * @returns {boolean} Whether the string is considered a URL
 */
function isUrl(str) {
    return str.match(/^(http|https|javascript|mailto|ftp|file|feed):\/\//);
}

/**
 * Execute a search based on current contents of main input
 *
 * @param {String} val
 */
function search(val) {
    var min_length_to_search = 1;

    if (isUrl(val)) {
        searchUrlValue(val);
    } else if (!isUrl(val) && val.length >= min_length_to_search) {
        searchValue(val);
    } else if (val.length == 0) {
        clearTagList();
        displayPosts(window.pinboard.data.posts);
    } else {
        clearPostList();
    }
}

/**
 * Search posts for a given value
 *
 * @param {String} val
 */
function searchValue(val) {
    var tags,
        posts = window.pinboard.data.posts;

    displayPosts(posts.filter(searchPosts(val)), val);

    if (val.length >= 1) {
        tags = searchTags(val);
        displayTags(tags);
    }
}

/**
 * Search posts for a URL and display results
 *
 * @param {String} val
 */
function searchUrlValue(val) {
    var posts = window.pinboard.data.posts;
    displayPosts(posts.filter(searchPostsUrl(val)), val);
}

/**
 * Get a function to match a post on url
 *
 * @param {String} val Value to be searched for
 *
 * @returns {Function} A function that determines whether or not the given post
 * has a URL containing the value
 */
function searchPostsUrl(val) {
    return function(a) {
        return a.href.indexOf(val) !== -1;
    }
}

/**
 * Remove all posts from the currently-displayed list
 */
function clearPostList() {
    deleteChildren(window.pinboard.Elements["posts"]);
}

/**
 * Remove all values from the post form
 */
function clearPostForm() {
    window.pinboard.Elements["post-url"].value = "";
    window.pinboard.Elements["post-title"].value = "";
    window.pinboard.Elements["post-desc"].value = "";
    window.pinboard.Elements["post-tags"].value = "";
}

/**
 * Remove all tags from the currently-displayed list
 */
function clearTagList() {
    deleteChildren(window.pinboard.Elements["tags"]);
}

/**
 * Remove all children from the given DOM element
 *
 * @param {Node} el Element whose children should be deleted
 */
function deleteChildren(el) {
    while (el.hasChildNodes()) {
        el.removeChild(el.firstChild);
    }
}

/**
 * Display the given Posts in the main list
 *
 * @param {Array} posts
 *
 * @todo some sort of support for pagination?
 */
function displayPosts(posts) {
    var index;
    clearPostList();

    for (index = 0; index < posts.length; index++) {
        addPostToList(posts[index]);
    }
}

/**
 * Construct HTML for given post object and add it to the post list
 *
 * @param {Object} post The post to add to the list
 *
 * @todo This could be a bit cleaner
 */
function addPostToList(post) {
    var posts = window.pinboard.Elements["posts"];
    var a = document.createElement("a");
    posts.appendChild(a);

    a.setAttribute("id", "");
    a.setAttribute("href", post.href);

    a.setAttribute(
        "class",
        "list-group-item list-group-item-action flex-column align-items-start"
    );

    var div = document.createElement("div");
    a.appendChild(div);

    div.setAttribute("class", "d-flex w-100 justify-content-between");

    var h5 = document.createElement("h5");
    div.appendChild(h5);

    var title = post.description || post.href;

    title = title.replace(/([_?./])/g, "$1​");

    h5.appendChild(document.createTextNode(title));

    var time = document.createElement("time");
    div.appendChild(time);

    time.setAttribute("datetime", "");
    time.appendChild(document.createTextNode(formatDateTime(post.time)));

    var p = document.createElement("p");
    a.appendChild(p);
    p.setAttribute("class", "mb-1 description");
    p.appendChild(document.createTextNode(post.extended));

// tags
    if (post.tags && post.tags.length) {
        var index,
            span;

        div = document.createElement("div");
        a.appendChild(div);
        div.setAttribute("class", "tags");

        for (index = 0; index < post.tags.length; index++) {
            span = document.createElement("span");
            div.appendChild(span);
            span.setAttribute("class", "badge badge-secondary");
            span.appendChild(document.createTextNode(post.tags[index]));
            div.appendChild(document.createTextNode(" "));
        }
    }

    var span = document.createElement("span");
    span.setAttribute("class", "edit");
    a.appendChild(span);
}

/**
 * Search all tags for a given value
 *
 * @param {String} val Value to search for
 *
 * @returns {Array} set of Strings representing matched tags
 */
function searchTags(val) {
    return window.pinboard.data.tags.filter(matchTag(val));
}

/**
 * Get a function to match a tag on a given search string
 *
 * @param {String} searchFor Value to search
 *
 * @return {Function} a function to search for the given value
 */
function matchTag(searchFor) {
    var re = new RegExp(searchFor, "i"), matched;

    return function(tag) {
        return tag.match(re);
    };
}

/**
 * Display given set of tags in tag list
 *
 * @param {Array} tags
 */
function displayTags(tags) {
    var a,
        index,
        tagsEl = window.pinboard.Elements["tags"];

    clearTagList();

    for (index = 0; index < tags.length; index++) {
        a = document.createElement("a");
        a.setAttribute("class", "badge badge-primary");
        a.setAttribute("href", "#");
        a.appendChild(document.createTextNode(tags[index]));
        tagsEl.appendChild(a);
        tagsEl.appendChild(document.createTextNode(" "));
    }
}

/**
 * Get a function to search a post for given string.
 *
 * @todo Also match against a.href, but only domain + path parts. To do that, we
 * should also pre-generate those strings to make this faster.
 *
 * @todo Caching to make fast editing of a given search string faster?
 *
 * @param {String} val Value to search for
 *
 * @returns {Function} a function to search a post for the given value
 */
function searchPosts(val) {
    val = val.toLowerCase();

    return function(a) {
        if (a.description.toLowerCase().indexOf(val) !== -1) {
            return true;
        }

        if (a.extended.toLowerCase().indexOf(val) !== -1) {
            return true;
        }

        var idx;

        for (idx = 0; idx < a.tags.length; idx++) {
            if (a.tags[idx].indexOf(val) !== -1) {
                return true;
            }
        }

        return false;
    }
}

/**
 * Kick everything off
 */
function start() {
    var missingTokenMessage = "You need to provide your Pinboard API token. "
        + "This will be stored in your browser's local memory, not on any "
        + "remote server.";

    hidePostForm();

    if (!window.pinboard.data.token) {
        hideMainInput();
        showAuthDialog(missingTokenMessage, "info");
    } else {
        checkForUpdates(function() {
            showMainInput();
            displayPosts(window.pinboard.data.posts);
        });
    }
}

/**
 * @param {Function} callback
 */
function checkForUpdates(callback) {
    hideMainInput();
    showProgressDialog("Checking for updates…");

    apiCall(window.pinboard.data.token, "posts/update", function() {
        if (this.status != 200) {
            hideProgressDialog();
            return;
        }

        var data = JSON.parse(this.responseText);

        if (!window.pinboard.data.updateTime
            || data.update_time > window.pinboard.data.updateTime
        ) {
            showProgressDialog("Fetching bookmarks…");

            fetchAllData(function() {
                hideProgressDialog();
                callback.call();
                window.pinboard.data.updateTime = data.update_time;
                saveData();
            });
        } else {
            hideProgressDialog();
            callback.call();
        }
    });
}

/**
 * Show the main input element
 */
function showMainInput() {
    window.pinboard.Elements["form-input"].style.display = "block";
}

/**
 * Hide the main input element
 */
function hideMainInput() {
    window.pinboard.Elements["form-input"].style.display = "none";
}

/**
 * Show the post form
 */
function showPostForm() {
    hideMainInput();
    hideTagList();
    hidePostList();
    window.pinboard.Elements["form-post"].style.display = "block";
}

/**
 * Hide the post form
 */
function hidePostForm() {
    window.pinboard.Elements["form-post"].style.display = "none";
}

/**
 * Show the post list element
 */
function showPostList() {
    window.pinboard.Elements["posts"].style.display = "block";
}

/**
 * Hide the post list element
 */
function hidePostList() {
    window.pinboard.Elements["posts"].style.display = "none";
}

/**
 * Show the tag list element
 */
function showTagList() {
    window.pinboard.Elements["tags"].style.display = "block";
}

/**
 * Hide the tag list element
 */
function hideTagList() {
    window.pinboard.Elements["tags"].style.display = "none";
}

/**
 * Populate the post form, given a URL. If URL is not already in memory, fetch
 * it.
 *
 * @param {String} val
 * @param {Function} callback
 */
function updatePostForm(val, callback) {
    var index,
        post,
        found = false,
        focusEl,
        els = window.pinboard.Elements;

    els["post-url"].value = val;

// look for url in posts

    for (index = 0; index < window.pinboard.data.posts.length; index++) {
        post = window.pinboard.data.posts[index];

        if (post.href == val) {
            els["post-title"].value = post.description;
            els["post-desc"].value = post.extended;
            els["post-tags"].value = post.tags.join(" ");

            if (!post.description) {
                focusEl = "post-title";
            } else if (!post.extended) {
                focusEl = "post-desc";
            } else {
                focusEl = "post-tags";
            }

            els[focusEl].focus();
            found = true;
            break;
        }
    }

// if url is new, fetch metadata
    if (!found) {
// todo indicate that we're in the processing of fetching a url somehow
        fetchRemoteUrl(val, callback);
    } else {
        callback.call();
    }
}

/**
 * Determine if token is valid
 *
 * @param {String} token
 *
 * @todo This is a bit messy - clean up!
 */
function validateToken(token) {
    hideAuthDialog();
    showProgressDialog("Checking token…");

    apiCall(token, "posts/update", function() {
        var res,
            msg = "";

        if (this.status != 200) {
            msg = "Invalid token; please check and try again";
        } else {
            res = JSON.parse(this.responseText);

            if (res.error) {
                if (res.error == "bad auth") {
                    msg = "Invalid token; please check and try again";
                } else {
                    msg = res.error;
                }
            } else {
                window.pinboard.data.token = token;
                showProgressDialog("Fetching bookmarks…");
                fetchAllData(waitOnRemoteData);
            }
        }

        if (msg != "") {
            hideProgressDialog();
            showAuthDialog(msg, "danger");
        }
    });
}

/**
 * Fetch tag and post data from remote API.
 *
 * @param {Function} callback a function to call once each fetch operation has
 * completed.
 */
function fetchAllData(callback) {
    window.pinboard.pending = 2;
    fetchAllTags(callback);
    fetchAllPosts(callback);
}

/**
 */
function waitOnRemoteData() {
    if (--window.pinboard.pending == 0) {
        saveData();
        hideProgressDialog();
        showMainInput();
        displayPosts(window.pinboard.data.posts);
        window.pinboard.Elements["maininput"].focus();
        delete window.pinboard.pending;
    }
}

/**
 * Make a call to the pinboard api
 *
 * @param {String} token Pinboard user's authentication token
 * @param {String} call Pinboard API method to call
 * @param {Function} callback Function to call once API call is complete
 * @param {Object} args Arguments to pass to the API method
 */
function apiCall(token, call, callback, args) {
    var base = "https://cors-anywhere.herokuapp.com/";

    var apiUrl = "https://api.pinboard.in/v1/" + call
        + "?auth_token=" + token + "&format=json";

    if (args) {
        for (var key in args) {
            apiUrl += '&' + key + '=' + encodeURIComponent(args[key]);
        }
    }

    ajaxRequest(base + apiUrl, { load: callback });
}

/**
 * Using the cors-anywhere service, fetch content from remote url and parse it
 * for title / description.
 *
 * @param {String} url
 * @param {Function} callback
 */
function fetchRemoteUrl(url, callback) {
    var cors_url = "https://cors-anywhere.herokuapp.com/" + encodeURI(url);
    showProgressDialog("Fetching remote URL …");

    ajaxRequest(cors_url, {
        load: function(ev) {
            var type = this.getResponseHeader("content-type"),
                focusEl = "post-title",
                node,
                els;

            if (type == "text/html" || type.substr(0, 10) == "text/html;") {
                el = document.createElement("html");
                el.innerHTML = this.responseText.replace(/<img /g, "<imgoff ");
                node = el.querySelector("head > title");
                els = window.pinboard.Elements;

                if (node) {
                    els["post-title"].value = node.textContent.trim();
                }

                node = el.querySelector("meta[name='description']");

                if (node) {
                    els["post-desc"].value
                        = node.getAttribute("content").trim();
                }

                if (!els["post-title"].value) {
                    focusEl = "post-title";
                } else if (!els["post-desc"]) {
                    focusEl = "post-desc";
                } else {
                    focusEl = "post-tags";
                }
            }

            hideProgressDialog();

            if (callback) {
                callback.call();
            }

            window.pinboard.Elements[focusEl].focus();
        },
        timeoutValue: 1000,
        timeout: function(ev) {
            hideProgressDialog();

            if (callback) {
                callback.call();
            }
        },
        error: function(ev) {
            hideProgressDialog();
        }
    });
}

/**
 * @param {Function} callback
 */
function fetchAllPosts(callback) {
    apiCall(window.pinboard.data.token, "posts/all", function() {
        var posts = JSON.parse(this.responseText);

        for (var index = 0; index < posts.length; index++) {
            delete posts[index].hash;
            delete posts[index].meta;
            delete posts[index].shared;
            delete posts[index].toread;
            posts[index].tags = posts[index].tags.split(/\s+/);
// todo maybe convert date to unix timestamp
        }

        window.pinboard.data.posts = posts;
        //saveData();

        if (callback) {
            callback.call();
        }
    });
}

/**
 * @param {Function} callback
 */
function fetchAllTags(callback) {
    apiCall(window.pinboard.data.token, "tags/get", function() {
        window.pinboard.data.tags = Object.keys(JSON.parse(this.responseText));

        if (callback) {
            callback.call();
        }
    });
}

/**
 */
function setupAuthForm() {
    var form = window.pinboard.Elements["auth-form"];

    form.addEventListener("submit", function(ev) {
        setAuthDialogMessage("");
        validateToken(window.pinboard.Elements["token-input"].value);
        ev.preventDefault();
    });
}

/**
 * @param {String} msg
 * @param {String} type
 */
function setAuthDialogMessage(msg, type) {
    var info = window.pinboard.Elements["auth-modal-info"];
    info.innerHTML = msg;

    if (msg === "") {
        info.style.display = "none";
    } else {
        info.style.display = "block";
    }

    info.setAttribute("class", "alert alert-" + type);
}

/**
 * @param {String} msg
 * @param {String} type
 */
function showAuthDialog(msg, type) {
    var els = window.pinboard.Elements;

    if (msg) {
        setAuthDialogMessage(msg, type);
    }

    els["auth-modal"].style.display = "block";

    if (window.pinboard.data.token) {
        els["token-input"].value = window.pinboard.data.token;
    }

    els["token-input"].focus();
}

/**
 * @param msg
 */
function showProgressDialog(msg) {
    if (msg) {
        window.pinboard.Elements["progress-title"].innerText = msg;
    }

    window.pinboard.Elements["progress-modal"].style.display = "block";
}

/**
 */
function hideProgressDialog() {
    window.pinboard.Elements["progress-modal"].style.display = "none";
}

/**
 */
function hideAuthDialog() {
    window.pinboard.Elements["auth-modal"].style.display = "none";
}

/**
 * Convert an ISO-formatted date into a 'nice' description, in English
 *
 * @param {String} date The date to convert, in any format supported by Date()
 *
 * @returns {String} A 'nicely formatted' version of the given date
 */
function formatDateTime(date) {
    var now = new Date();
    var then = new Date(date);
    var result, month, day;

    var days = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
        "Friday", "Saturday" ];

    var months = [ "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December" ];

    var secondsDiff = (now - then) / 1000;

    if (secondsDiff < 60) {
        result = "now";
    } else if (secondsDiff < 60 * 60 * 24) {
// 'today' Note that this might be confusing — day should actually be defined
// by day rather than 'last 24 hours'
        var mins = "" + then.getMinutes();
        mins = mins == "0" ? "00" : mins;
        mins = mins.length == 1 ? "0" + mins : mins; 
        result = then.getHours() + ":" + mins;
    } else if (secondsDiff < 60 * 60 * 24 * 7) {
        result = days[then.getDay()];
    //} else if (secondsDiff < 60 * 60 * 24 * 365) {
    } else if (now.getFullYear() == then.getFullYear()) {
        day = then.getDate();
        result = months[then.getMonth()] + " " + day + ordinal(day);
    } else {
        month = then.getMonth() + 1;
        day = then.getDate();
        month = month < 10 ? "0" + month : month;
        day = day < 10 ? "0" + day : day;
        result = then.getFullYear() + "–" + month + "–"  + day;
    }

    return result;
}

/**
 * @param {number} i
 *
 * @returns {String}
 */
function ordinal(i) {
    var j = i % 10;
    var k = i % 100;
    var suffix = "th";

    if (j == 1 && k != 11) {
        suffix = "st";
    } else if (j == 2 && k != 12) {
        suffix = "nd";
    } else if (j == 3 && k != 13) {
        suffix = "rd";
    }

    return suffix;
}

/**
 * Update local cache of data
 */
function saveData() {
    localStorage.setItem("data", JSON.stringify(window.pinboard.data));
}

/**
 * 
 * @param {String} url
 * @param {Object} opts
 */
function ajaxRequest(url, opts) {
    var request = new XMLHttpRequest();
    opts = ajaxDefaults(opts);

    if (opts.hasOwnProperty("timeoutValue")) {
        request.timeout = opts.timeoutValue;
    }

    ajaxEvents(request, opts);
    request.open(opts.method, url);
    ajaxHeaders(request, opts);
    request.send(opts.body);
}

/**
 * Validate and 'correct' the given options object
 *
 * @param {Object} opts Input options
 *
 * @returns {Object} Update options
 */
function ajaxDefaults(opts) {
    if (!opts.method || (opts.method != 'GET' && opts.method != 'POST')) {
        opts.method = "GET";
    }

    return opts;
}

/**
 * @param {XMLHttpRequest} request
 * @param {Object} opts
 */
function ajaxEvents(request, opts) {
    var idx,
        ev,
        evs = [ "abort", "error", "load", "loadEnd", "timeout" ];

    for (idx = 0; idx < evs.length; idx++) {
        ev = evs[idx];

        if (opts[ev]) {
            registerEvent(request, ev, opts[ev]);
        }
    }
}

/**
 * @param {XMLHttpRequest} request
 * @param ev
 * @param {Function} callback
 */
function registerEvent(request, ev, callback) {
    request.addEventListener(ev, function(e) {
        callback.call(this);
    });
}

/**
 * Set headers of the given request according to options provided
 *
 * @param {XMLHttpRequest} request 
 * @param {Object} opts
 */
function ajaxHeaders(request, opts) {
    if (opts.contentType) {
        request.setRequestHeader("Content-type", opts.contentType);
    }
}
