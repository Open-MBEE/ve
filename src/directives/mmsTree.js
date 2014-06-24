  'use strict';

  angular.module('mms.directives')
  .directive('mmsTree', ["$timeout", "$log", '$templateCache', mmsTree]);

  function mmsTree($timeout, $log, $templateCache) {
        return {
          restrict: 'E',
          template: $templateCache.get('mms/templates/mmsTree.html'),

          replace: true,
          scope: {
            treeData: '=',
            sectionNumbering: '=',
            onSelect: '&',
            initialSelection: '@',
            treeControl: '='
          },
          link: function(scope, element, attrs) {
            var error, expand_all_parents, expand_level, for_all_ancestors, for_each_branch, get_parent, n, on_treeData_change, on_initialSelection_change, select_branch, selected_branch, tree;
            error = function(s) {
              $log.log('ERROR:' + s);
              return void 0;
            };
            if (attrs.iconExpand === null || attrs.iconExpand === undefined) {
              attrs.iconExpand = 'icon-plus  glyphicon glyphicon-plus  fa fa-plus';
            }
            if (attrs.iconCollapse === null || attrs.iconCollapse === undefined) {
              attrs.iconCollapse = 'icon-minus glyphicon glyphicon-minus fa fa-minus';
            }
            if (attrs.iconLeaf === null || attrs.iconLeaf === undefined) {
              attrs.iconLeaf = 'icon-file  glyphicon glyphicon-file  fa fa-file';
            }
            if (attrs.expandLevel === null || attrs.expandLevel === undefined) {
              attrs.expandLevel = '3';
            }
            expand_level = parseInt(attrs.expandLevel, 10);
            if (!scope.treeData) {
              $log.warn('no treeData defined for the tree!');
              return;
            }
            if (scope.treeData.length === null || scope.treeData.length === undefined) {
              if (scope.treeData.label !== null && scope.treeData.label !== undefined) {
                scope.treeData = [scope.treeData];
              } else {
                $log.warn('treeData should be an array of root branches');
                return;
              }
            }
            for_each_branch = function(f) {
              var do_f, root_branch, _i, _len, _ref, _results;
              do_f = function(branch, level) {
                var child, _i, _len, _ref, _results;
                f(branch, level);
                if (branch.children !== null && branch.children !== undefined) {
                  _ref = branch.children;
                  _results = [];
                  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    child = _ref[_i];
                    _results.push(do_f(child, level + 1));
                  }
                  return _results;
                }
              };
              _ref = scope.treeData;
              _results = [];
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                root_branch = _ref[_i];
                _results.push(do_f(root_branch, 1));
              }
              return _results;
            };
            selected_branch = null;
            select_branch = function(branch) {
              if (!branch) {
                if (selected_branch !== null && selected_branch !== undefined) {
                  selected_branch.selected = false;
                }
                selected_branch = null;
                return;
              }
              if (branch !== selected_branch) {
                if (selected_branch !== null && selected_branch !== undefined) {
                  selected_branch.selected = false;
                }
                branch.selected = true;
                selected_branch = branch;
                expand_all_parents(branch);
                if (branch.onSelect !== null && branch.onSelect !== undefined) {
                  return $timeout(function() {
                    return branch.onSelect(branch);
                  });
                } else {
                  if (scope.onSelect !== null && scope.onSelect !== undefined) {
                    return $timeout(function() {
                      return scope.onSelect({
                        branch: branch
                      });
                    });
                  }
                }
              }
            };
            scope.user_clicks_branch = function(branch) {
              if (branch !== selected_branch) {
                return select_branch(branch);
              }
            };
            get_parent = function(child) {
              var parent;
              parent = void 0;
              if (child.parent_uid) {
                for_each_branch(function(b) {
                  if (b.uid === child.parent_uid) {
                    parent = b;
                    return parent;
                  }
                });
              }
              return parent;
            };
            for_all_ancestors = function(child, fn) {
              var parent;
              parent = get_parent(child);
              if (parent !== null && parent !== undefined) {
                fn(parent);
                return for_all_ancestors(parent, fn);
              }
            };
            expand_all_parents = function(child) {
              return for_all_ancestors(child, function(b) {
                b.expanded = true;
                return b.expanded;
              });
            };
            scope.tree_rows = [];
            on_initialSelection_change = function(){
                if (scope.initialSelection !== null) {
                  for_each_branch(function(b) {
                    if (b.data.sysmlid === scope.initialSelection) {
                      return select_branch(b);
                    }
                  });
                }
              };
            on_treeData_change = function() {
              var add_branch_to_list, root_branch, _i, _len, _ref, _results;
              for_each_branch(function(b, level) {
                if (!b.uid) {
                  b.uid = "" + Math.random();
                  return b.uid;
                }
              });
              $log.log('UIDs are set.');
              for_each_branch(function(b) {
                var child, _i, _len, _ref, _results;
                if (angular.isArray(b.children)) {
                  _ref = b.children;
                  _results = [];
                  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    child = _ref[_i];
                    _results.push(child.parent_uid = b.uid);
                  }
                  return _results;
                }
              });
              scope.tree_rows = [];
              for_each_branch(function(branch) {
                var child, f;
                if (branch.children) {
                  if (branch.children.length > 0) {
                    f = function(e) {
                      if (typeof e === 'string') {
                        return {
                          label: e,
                          children: []
                        };
                      } else {
                        return e;
                      }
                    };
                    branch.children = (function() {
                      var _i, _len, _ref, _results;
                      _ref = branch.children;
                      _results = [];
                      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                        child = _ref[_i];
                        _results.push(f(child));
                      }
                      return _results;
                    })();
                    return branch.children;
                  }
                } else {
                  branch.children = [];
                  return branch.children;
                }
              });

              add_branch_to_list = function(level, section, branch, visible) {
                var child, child_visible, tree_icon, _i, _j, _len, _ref, _results;
                if (branch.expanded === null || branch.expanded === undefined) {
                  branch.expanded = false;
                }
                if (!branch.children || branch.children.length === 0) {
                  tree_icon = attrs.iconLeaf;
                } else {
                  if (branch.expanded) {
                    tree_icon = attrs.iconCollapse;
                  } else {
                    tree_icon = attrs.iconExpand;
                  }
                }
                scope.tree_rows.push({
                  level: level,
                  section: section,
                  branch: branch,
                  label: branch.label,
                  tree_icon: tree_icon,
                  visible: visible
                });
                if (branch.children !== null && branch.children !== undefined) {
                  _ref = branch.children;
                  _results = [];
                  for (_i = 0, _j = 0, _len = _ref.length; _i < _len; _i++) {
                    child = _ref[_i];
                    child_visible = visible && branch.expanded;
                    
                    var sectionChar = '.';
                    var sectionValue = '';
                    if (section === '')
                      sectionChar = '';

                    if (child.type === "section") 
                      _results.push(add_branch_to_list(level + 1, '§ ', child, child_visible));
                    else {
                      _j++;
                      if (scope.sectionNumbering === undefined || scope.sectionNumbering === null || scope.sectionNumbering)
                        sectionValue = section + sectionChar + _j;

                      _results.push(add_branch_to_list(level + 1, sectionValue, child, child_visible));
                    }
                  }
                  return _results;
                }
              };
              _ref = scope.treeData;
              _results = [];
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                root_branch = _ref[_i];
                _results.push(add_branch_to_list(1, '', root_branch, true));
              }

              return _results;

            };
            scope.$watch('treeData', on_treeData_change, true);
            scope.$watch('initialSelection', on_initialSelection_change);
            if (attrs.initialSelection !== null) {
              for_each_branch(function(b) {
                if (b.data.sysmlid === attrs.initialSelection) {
                  return $timeout(function() {
                    return select_branch(b);
                  });
                }
              });
            }
            n = scope.treeData.length;
            $log.log('num root branches = ' + n);
            for_each_branch(function(b, level) {
              b.level = level;
              b.expanded = b.level < expand_level;
              return b.expanded;
            });
            scope.expand_all = function() {
                  return for_each_branch(function(b, level) {
                    b.expanded = true;
                    return b.expanded;
                  });
                };
            if (scope.treeControl !== null && scope.treeControl !== undefined) {
              if (angular.isObject(scope.treeControl)) {
                tree = scope.treeControl;
                tree.expand_all = function() {
                  return for_each_branch(function(b, level) {
                    b.expanded = true;
                    return b.expanded;
                  });
                };
                tree.collapse_all = function() {
                  return for_each_branch(function(b, level) {
                    b.expanded = false;
                    return b.expanded;
                  });
                };
                tree.get_first_branch = function() {
                  n = scope.treeData.length;
                  if (n > 0) {
                    return scope.treeData[0];
                  }
                };
                tree.select_first_branch = function() {
                  var b;
                  b = tree.get_first_branch();
                  return tree.select_branch(b);
                };
                tree.get_selected_branch = function() {
                  return selected_branch;
                };
                tree.get_parent_branch = function(b) {
                  return get_parent(b);
                };
                tree.select_branch = function(b) {
                  select_branch(b);
                  return b;
                };
                tree.get_children = function(b) {
                  return b.children;
                };
                tree.select_parent_branch = function(b) {
                  var p;
                  if (b === null || b === undefined) {
                    b = tree.get_selected_branch();
                  }
                  if (b !== null && b !== undefined) {
                    p = tree.get_parent_branch(b);
                    if (p !== null && p !== undefined) {
                      tree.select_branch(p);
                      return p;
                    }
                  }
                };
                tree.add_branch = function(parent, new_branch) {
                  if (parent !== null) {
                    parent.children.push(new_branch);
                    parent.expanded = true;
                  } else {
                    scope.treeData.push(new_branch);
                  }
                  return new_branch;
                };
                tree.add_root_branch = function(new_branch) {
                  tree.add_branch(null, new_branch);
                  return new_branch;
                };
                tree.expand_branch = function(b) {
                  if (b === null) {
                    b = tree.get_selected_branch();
                  }
                  if (b !== null) {
                    b.expanded = true;
                    return b;
                  }
                };
                tree.collapse_branch = function(b) {
                  if (b === null) {
                    b = selected_branch;
                  }
                  if (b !== null) {
                    b.expanded = false;
                    return b;
                  }
                };
                tree.get_siblings = function(b) {
                  var p, siblings;
                  if (b === null) {
                    b = selected_branch;
                  }
                  if (b !== null) {
                    p = tree.get_parent_branch(b);
                    if (p) {
                      siblings = p.children;
                    } else {
                      siblings = scope.treeData;
                    }
                    return siblings;
                  }
                };
                tree.get_next_sibling = function(b) {
                  var i, siblings;
                  if (b === null) {
                    b = selected_branch;
                  }
                  if (b !== null) {
                    siblings = tree.get_siblings(b);
                    n = siblings.length;
                    i = siblings.indexOf(b);
                    if (i < n) {
                      return siblings[i + 1];
                    }
                  }
                };
                tree.get_prev_sibling = function(b) {
                  var i, siblings;
                  if (b === null) {
                    b = selected_branch;
                  }
                  siblings = tree.get_siblings(b);
                  n = siblings.length;
                  i = siblings.indexOf(b);
                  if (i > 0) {
                    return siblings[i - 1];
                  }
                };
                tree.select_next_sibling = function(b) {
                  var next;
                  if (b === null) {
                    b = selected_branch;
                  }
                  if (b !== null) {
                    next = tree.get_next_sibling(b);
                    if (next !== null) {
                      return tree.select_branch(next);
                    }
                  }
                };
                tree.select_prev_sibling = function(b) {
                  var prev;
                  if (b === null) {
                    b = selected_branch;
                  }
                  if (b !== null) {
                    prev = tree.get_prev_sibling(b);
                    if (prev !== null) {
                      return tree.select_branch(prev);
                    }
                  }
                };
                tree.get_first_child = function(b) {
                  var _ref;
                  if (b === null) {
                    b = selected_branch;
                  }
                  if (b !== null) {
                    if (((_ref = b.children) !== null ? _ref.length : void 0) > 0) {
                      return b.children[0];
                    }
                  }
                };
                tree.get_closest_ancestor_next_sibling = function(b) {
                  var next, parent;
                  next = tree.get_next_sibling(b);
                  if (next !== null) {
                    return next;
                  } else {
                    parent = tree.get_parent_branch(b);
                    return tree.get_closest_ancestor_next_sibling(parent);
                  }
                };
                tree.get_next_branch = function(b) {
                  var next;
                  if (b === null) {
                    b = selected_branch;
                  }
                  if (b !== null) {
                    next = tree.get_first_child(b);
                    if (next !== null) {
                      return next;
                    } else {
                      next = tree.get_closest_ancestor_next_sibling(b);
                      return next;
                    }
                  }
                };
                tree.select_next_branch = function(b) {
                  var next;
                  if (b === null) {
                    b = selected_branch;
                  }
                  if (b !== null) {
                    next = tree.get_next_branch(b);
                    if (next !== null) {
                      tree.select_branch(next);
                      return next;
                    }
                  }
                };
                tree.last_descendant = function(b) {
                  var last_child;
                  if (b === null) {
                  }
                  n = b.children.length;
                  if (n === 0) {
                    return b;
                  } else {
                    last_child = b.children[n - 1];
                    return tree.last_descendant(last_child);
                  }
                };
                tree.get_prev_branch = function(b) {
                  var parent, prev_sibling;
                  if (b === null) {
                    b = selected_branch;
                  }
                  if (b !== null) {
                    prev_sibling = tree.get_prev_sibling(b);
                    if (prev_sibling !== null) {
                      return tree.last_descendant(prev_sibling);
                    } else {
                      parent = tree.get_parent_branch(b);
                      return parent;
                    }
                  }
                };
                tree.select_prev_branch = function(b) {
                  var prev;
                  if (b === null) {
                    b = selected_branch;
                  }
                  if (b !== null) {
                    prev = tree.get_prev_branch(b);
                    if (prev !== null) {
                      tree.select_branch(prev);
                      return prev;
                    }
                  }
                };
                return tree.select_prev_branch;
              }
            }
          }
        };
      }