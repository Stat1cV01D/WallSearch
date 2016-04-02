// ==UserScript==
// @id             wallsearchDate@vkopt
// @name           Wall Search by criteria
// @version        1.0
// @namespace      https://greasyfork.org/users/23
// @author         Stat1cV01D@github
// @description    Плагин для VkOpt, ищущий по стене посты и комменты по заданным критериям
// @include        *vk.com*
// @run-at         document-end
// @noframes
// @grant none
// ==/UserScript==
/*jshint multistr: true */
if (!window.vkopt_plugins) vkopt_plugins = {};
(function () {
    var PLUGIN_ID = 'wallSearch';
    
    // Taken from ExtJS 5.1 GPL
    var arrayPrototype = Array.prototype,
        slice = arrayPrototype.slice,
        erase = function (array, index, removeCount) {
            array.splice(index, removeCount);
            return array;
        };
    
    ExtArray = {
        /**
         * Returns a new array with unique items.
         *
         * @param {Array} array
         * @return {Array} results
         */
        unique: function(array) {
            var clone = [],
                i = 0,
                ln = array.length,
                item;

            for (; i < ln; i++) {
                item = array[i];

                if (indexOf(clone, item) === -1) {
                    clone.push(item);
                }
            }

            return clone;
        },
        
        /**
         * Merge multiple arrays into one with unique items that exist in all of the arrays.
         *
         * @param {Array} array1
         * @param {Array} array2
         * @param {Array} etc
         * @return {Array} intersect
         */
        intersect: function() {
            var intersection = [],
                arrays = slice.call(arguments),
                arraysLength,
                array,
                arrayLength,
                minArray,
                minArrayIndex,
                minArrayCandidate,
                minArrayLength,
                element,
                elementCandidate,
                elementCount,
                i, j, k;

            if (!arrays.length) {
                return intersection;
            }

            // Find the smallest array
            arraysLength = arrays.length;
            for (i = minArrayIndex = 0; i < arraysLength; i++) {
                minArrayCandidate = arrays[i];
                if (!minArray || minArrayCandidate.length < minArray.length) {
                    minArray = minArrayCandidate;
                    minArrayIndex = i;
                }
            }

            minArray = ExtArray.unique(minArray);
            erase(arrays, minArrayIndex, 1);

            // Use the smallest unique'd array as the anchor loop. If the other array(s) do contain
            // an item in the small array, we're likely to find it before reaching the end
            // of the inner loop and can terminate the search early.
            minArrayLength = minArray.length;
            arraysLength = arrays.length;
            for (i = 0; i < minArrayLength; i++) {
                element = minArray[i];
                elementCount = 0;

                for (j = 0; j < arraysLength; j++) {
                    array = arrays[j];
                    arrayLength = array.length;
                    for (k = 0; k < arrayLength; k++) {
                        elementCandidate = array[k];
                        if (element === elementCandidate) {
                            elementCount++;
                            break;
                        }
                    }
                }

                if (elementCount === arraysLength) {
                    intersection.push(element);
                }
            }

            return intersection;
        }
    };

    vkopt_plugins[PLUGIN_ID] = {
        Name: 'Search posts and comments by criteria',
        el_id: 'vk_wall_search',
        end: false,
        totalWall: 0,
        totalComments: 0,
        query_id: 0,
        step: 100,
        currentPosts: null,
        qDay: new Date(),
        result: [],
        // VK calendar functions
        dayFromVal: function (v) {
            var n = v.split('.');
            return new Date(intval(n[2]), intval(n[1]) - 1, intval(n[0]));
            //(n[0] < 10 ? '0' : '') + n[0] + (n[1] < 10 ? '0' : '') + n[1] + n[2];
        },
        calendarUpd: function (clearInp) {
            var cur = vkopt_plugins[PLUGIN_ID];
            console.log('calendar');

            if (cur.imDPIgnore) {
                cur.imDPIgnore = false;
                return;
            }
            var d = val('im_datesearch').split('.'), c = new Date();
            c = [c.getDate(), c.getMonth() + 1, c.getFullYear()];
            if (d[2] > c[2] || d[2] == c[2] && (d[1] > c[1] || d[1] == c[1] && d[0] > c[0])) {
                cur.imDP.setDate();
                return;
            }
            if (clearInp === 'clear') {
                cur.imDP.setDate();
                cur.imSD = false;
            } else if (cur.imSD == val('im_datesearch')) {
                return;
            } else {
                cur.imSD = val('im_datesearch');
            }
            cur.qDay = cur.imSD ? cur.dayFromVal(cur.imSD) : false;
            //cur.start(val(vk.id));
            cur.imDP.hide();
        },
        calendar: function () { // При подключении плагина к Вкопту
            var cur = vkopt_plugins[PLUGIN_ID];
            stManager.add(['ui_controls.js', 'datepicker.js', 'datepicker.css'], function () {
                console.log('start');
                if (!cur.imDP) {
                    var clLnk = '<td class="im_cal_clear" colspan="7"><a onclick="vkopt_plugins.' + PLUGIN_ID + '.calendarUpd(\'clear\');" class="im_cal_clear_lnk">' + getLang('wall_clear_date_filter') + '</a></td>';
                    cur.imDP = new Datepicker(ge('im_datesearch'), {
                        width: 140,
                        resfmt: 'plain',
                        addRows: '<tr id="im_day_clear">' + clLnk + '</tr>',
                        addRowsM: '<tr id="im_month_clear">' + clLnk + '</tr>',
                        onUpdate: cur.calendarUpd
                    });
                }
                cur.imDPIgnore = true;
                if (cur.qDay) {
                    cur.imDP.setDate(intval(cur.qDay.getFullYear()), intval(cur.qDay.getMonth() + 1), intval(cur.qDay.getDate()));
                    cur.imSD = val('im_datesearch');
                } else {
                    cur.imDP.setDate();
                    cur.imSD = false;
                }
                toggleClass(ge('im_datesearch_wrap'), 'im_no_search_day', !cur.imSD);
                triggerEvent(geByClass1('datepicker_control', ge('im_datesearch_wrap')), 'mousedown', false, true);
                ge('im_datesearch_cal_box').style.marginTop = '24px';
            });
        },
        onLocation: function (nav_obj, cur_module_name) {   // при открытии страницы группы или паблика
            if (!ge(this.el_id) && (cur_module_name == 'groups' || cur_module_name == 'public'))
                this.UI();
        },
        UI: function () {   // Добавление ссылки
            stManager.add(['im.css'], function () {
            });
            var html =
            '<div>\
                <div id="im_datesearch_wrap" class="fl_r">\
                    <input type="hidden" id="im_datesearch" name="im_datesearch">\
                        <div id="im_search_date" class="inl_bl" onclick="vkopt_plugins.' + PLUGIN_ID + '.calendar()"></div>\
                </div>\
                <table style="border:none" id="vkopt_plugins_' + PLUGIN_ID + '_values_table">\
                    <tr>\
                        <td>содержат лайки пользователей:</td>\
                        <td><input type="text" size="12" value="" style="margin: 1px"/></td>\
                    </tr>\
                    <tr>\
                        <td>являются ответом пользователям:</td>\
                        <td><input type="text" size="12" value="" style="margin: 1px"/></td>\
                    </tr>\
                    <tr>\
                        <td>id пользователя:</td>\
                        <td><input type="text" size="12" value="' + vk.id + '" style="margin: 1px"/></td>\
                    </tr>\
                </table>\
                <div>\
                    <button class="flat_button" onclick="vkopt_plugins.' + PLUGIN_ID + '.start()">Старт</button>\
                    <button class="flat_button" id="vk_prune" style="display: none;"\
                            onclick="vkopt_plugins.' + PLUGIN_ID + '.prune()">Удалить всё\
                    </button>\
                    <br>\
                </div>\
                <div id="vkWallSearchProgress1"></div>\
                <div id="vkWallSearchProgress2"></div>\
                <div id="vkWallSearchResult" class="wall_module"></div>\
            </div>';
            var a = vkCe('a', {id: this.el_id}, 'Поиск по автору');
            a.onclick = function () {
                vkAlertBox('Поиск', html, function () {
                    vkopt_plugins[PLUGIN_ID].end = true;
                    vkopt_plugins[PLUGIN_ID].imDP = null;
                });
            };
            var parent;
            if (parent = ge('page_actions')) {
                parent.appendChild(a);
            }
            else if (parent = (ge('unsubscribe') || ge('subscribe'))) {
                parent.appendChild(vkCe('br'));
                parent.appendChild(a);
            }
        },
        convertToIntArray: function(array) {
            for (var a in array) {
                array[a] = parseInt(array[a], 10);
            }
            return array;
        },
        start: function () {
            var table = ge('vkopt_plugins_' + PLUGIN_ID + '_values_table');
            var inputs = table.getElementsByTagName('input');
            var uid = parseInt(val(inputs[2]), 10);
            var answers = val(inputs[1]);
            var likes = this.convertToIntArray(val(inputs[0]));
            
            this.thresholdTime = this.qDay.getTime() / 1000;
            this.answers = (answers && answers.split(',')) || [];
            this.likes = (likes && likes.split(',')) || [];
            this.convertToIntArray(this.answers);
            this.convertToIntArray(this.likes);
            
            this.end = false;
            this.query_id = uid;
            this.runWall(0);
            this.result = [];
            var fch;
            while (fch = ge('vkWallSearchResult').firstChild)
                re(fch);
            show('vk_prune');
        },
        runWall: function (_offset) {
            if (!this.end) dApi.call('wall.get', {
                owner_id: cur.oid,
                count: this.step,
                offset: _offset
            }, function (r, response) {
                if (response) {
                    vkopt_plugins[PLUGIN_ID].totalWall = response.shift();
                    console.log('start');
                    if (response.length > 0) {
                        vkopt_plugins[PLUGIN_ID].currentPosts = response;
                        vkopt_plugins[PLUGIN_ID].processPosts(0, _offset, function () {
                            vkopt_plugins[PLUGIN_ID].runWall(_offset + vkopt_plugins[PLUGIN_ID].step);
                        });
                    }
                    else
                        ge('vkWallSearchProgress1').innerHTML = ge('vkWallSearchProgress2').innerHTML = '';
                } else  // retry
                    vkopt_plugins[PLUGIN_ID].runWall(_offset);
            });
        },
        processPosts: function (i, wall_offset, callback) {
            var me = vkopt_plugins[PLUGIN_ID];
            var post;
            if (i < me.currentPosts.length) {
                me.progress(wall_offset + i, me.totalWall, 1);
                post = me.currentPosts[i];
                if (me.isPostConditionMet(post)) {
                    me.processLikes(0, 'post', post, function(item) {
                        me.render(item);
                    });
                    if (post.comments && post.comments.count && me.query_id > 0) {
                        me.runComments(0, i, function () {
                            me.processPosts(i + 1, wall_offset, callback);
                        });
                    } else { 
                        me.processPosts(i + 1, wall_offset, callback);
                    }
                } else if (post.comments && post.comments.count && me.query_id > 0) {
                    me.runComments(0, i, function () {
                        me.processPosts(i + 1, wall_offset, callback);
                    });
                } else {
                    me.processPosts(i + 1, wall_offset, callback);
                }
            } else
                callback();
        },
        processLikes: function(_offset, type, item, callback) {
            var me = vkopt_plugins[PLUGIN_ID];
            if (this.end)
                return;
            if (!me.likes.length) {
                callback(item);
            } else if (item.likes.count) {
                dApi.call('likes.getList', {
                    type: type,
                    owner_id: cur.oid,
                    item_id: item.id || item.cid, //post id or comment id
                    filter: 'likes',
                    friends_only: 0,
                    offset: _offset,
                    count: me.step,
                    skip_own: 0
                }, function (r, response) {
                    if (response && response.count > 0) {
                        // If any of the users listed has liked this post/comment?
                        if (ExtArray.intersect(me.likes, response.users).length > 0) {
                            callback(item);
                        } else if (_offset + response.users.length < response.count) {
                            me.processLikes(_offset + me.step, type, item, callback);
                        }
                    }
                });
            }
        },
        isConditionMet: function(item) {
            var me = vkopt_plugins[PLUGIN_ID];
            return ((me.query_id || me.answers.length || me.likes.length) && 
                item.date <= me.thresholdTime
            );
        },
        isPostConditionMet: function(post) {
            var me = vkopt_plugins[PLUGIN_ID];
            return (
                me.isConditionMet.apply(me, arguments) &&
                (!me.query_id || (post.signer_id == me.query_id || post.from_id == me.query_id))
            );
        },
        isCommentConditionMet: function(comment) {
            var me = vkopt_plugins[PLUGIN_ID];
            return (
                me.isConditionMet.apply(me, arguments) && 
                (!me.query_id || (comment.from_id == me.query_id)) &&
                ((!me.answers.length && (me.query_id || me.likes.length)) ||
                     indexOf(me.answers, comment.reply_to_uid) != -1
                )
            );
        },
        runComments: function (_offset, post_i, callback) {
            var me = this;
            if (!this.end) dApi.call('wall.getComments', {
                owner_id: this.currentPosts[post_i].to_id || cur.oid,
                post_id: this.currentPosts[post_i].id,
                need_likes: 1,
                preview_length: 50,
                count: this.step,
                offset: _offset
            }, function (r, response) {
                if (response) {
                    me.totalComments = response.shift();
                    me.progress(_offset, me.totalComments, 2);
                    if (response.length > 0) {
                        for (var i in response) {
                            if (me.isCommentConditionMet(response[i]))
                                me.processLikes(0, 'comment', response[i], function(item) { 
                                    me.render(item, me.currentPosts[post_i].id);
                                });
                        }
                        if (_offset + me.step < me.totalComments)
                            me.runComments(_offset + me.step, post_i, callback);
                        else
                            callback();
                    }
                    else
                        callback();
                } else //retry
                    me.runComments(_offset, post_i, callback);
            });
        },
        render: function (post, post_id) {
            var onclick = function () {
                ajax.post('/wkview.php', {
                        act: 'show',
                        al: 1,
                        reply: post.cid || '',
                        w: 'wall' + cur.oid + '_' + (post.id || post_id)
                    },
                    {
                        onDone: function (a, html, obj) {
                            window.wkcur = obj;
                            vkAlertBox('Просмотр записи', html).setOptions({width: 660});
                            animate(ge('box_layer_wrap'), {
                                scrollTop: getXY('wpt' + pid)[1],
                                transition: Fx.Transitions.easeInCirc
                            }, 100);
                        }
                    });
            };
            var templateActions = '<div class="fl_r post_actions_wrap">\
				<div class="post_actions">\
					<div style="opacity: 0;" id="post_delete{pid}" class="post_delete_button fl_r"\
						 onclick="cancelEvent(event);vkopt_plugins.' + PLUGIN_ID + '.deletePost(\'{pid}\',{is_comment});"\
						 onmouseover="wall.activeDeletePost(\'{pid}\', \'Удалить запись\', \'post_delete\')"\
						 onmouseout="wall.deactiveDeletePost(\'{pid}\', \'post_delete\')"></div>\
				</div>\
			</div>';
            var templateText = '<div class="wall_text">\
					<div class="wall_post_text">{text}</div>\
				</div>\
				<div class="reply_link_wrap sm" id="wpe_bottom{pid}">\
					<small><a href="/wall{pid}" target="_blank" onclick="return false;">{date}</a></small>\
				</div>';
            var pid = (post.to_id || cur.oid) + '_' + (post.cid || post.id || post_id);
            var div = vkCe('div', {
                'id': 'post' + pid,
                'class': "post all",
                'onmouseover': "wall.postOver('" + pid + "');",
                'onmouseout': "wall.postOut('" + pid + "');"
            }, (templateActions + templateText).replace(/\{pid\}/g, pid)
                .replace('{date}', dateFormat(post.date * 1000, "dd.mm.yyyy"))
                .replace(/\{text\}/g, post.text.replace(/\[[^\|]+\|([^\]]+)\]/g, '$1'))
                .replace('{is_comment}', intval(!!post.cid)));
            div.onclick = onclick;
            ge('vkWallSearchResult').appendChild(div);
            this.result.push({pid: pid, is_comment: intval(!!post.cid)});
        },
        progress: function (current, total, number) {   // обновление прогрессбара
            if (!total) total = 1;
            var texts = ['Стена, %', 'Комментарии, %'];
            ge('vkWallSearchProgress' + number).innerHTML = vkProgressBar(current, total, 380, texts[number - 1]);
        },
        deletePost: function (pid, is_comment, callback) {
            wall.deactiveDeletePost(pid, 'post_delete');
            var op = pid.split('_');
            dApi.call('wall.delete' + (is_comment ? 'Comment' : ''), {
                owner_id: op[0],
                comment_id: op[1],
                post_id: op[1]
            }, function (r, response) {
                if (response) re('post' + pid);
                if (callback) callback();
            });
        },
        prune: function () {
            var me = vkopt_plugins[PLUGIN_ID];
            if (me.result.length) {
                var post = me.result.shift();
                var _callee = arguments.callee;
                me.deletePost(post.pid, post.is_comment, function () {
                    setTimeout(_callee, 300);
                });
            }
        }
    };
    if (window.vkopt_ready) vkopt_plugin_run(PLUGIN_ID);
})();