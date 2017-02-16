'use strict';

/* Controllers */

angular.module('mmsApp')
.controller('ToolCtrl', ['$scope', '$rootScope', '$state', '$uibModal', '$q', '$timeout', 'hotkeys',
            'ElementService', 'ProjectService', 'growl', 'projectOb', 'refOb', 'documentOb', 'viewOb', 'Utils',
function($scope, $rootScope, $state, $uibModal, $q, $timeout, hotkeys,
    ElementService, ProjectService, growl, projectOb, refOb, documentOb, viewOb, Utils) {

    $scope.specInfo = {
        refId: refOb.id,
        commitId: 'latest',
        projectId: projectOb.id,
        id: null
    };
    //TODO change isTag
    $scope.editable = documentOb && documentOb._editable && !refOb.isTag;
    $scope.documentOb = documentOb;
    $scope.refOb = refOb;

    if (viewOb) {
        $scope.specInfo.id = $scope.viewOb.sysmlId;
        $scope.viewId = viewOb.sysmlId;
    } else if (documentOb) {
        $scope.specInfo.id = documentOb.sysmlId;
        $scope.viewId = documentOb.sysmlId;
    }

    $scope.specApi = {};
    $scope.viewContentsOrderApi = {};
    $rootScope.ve_togglePane = $scope.$pane;

    $scope.show = {
        element: true,
        history: false,
        reorder: false,
        jobs: false
    };
    $scope.tracker = {};
    if (!$rootScope.ve_edits)
        $rootScope.ve_edits = {};
    $scope.presentElemEditCnts = {};

    // Set edit count for tracker view 
    $scope.veEditsLength = function() {
        return Object.keys($rootScope.ve_edits).length;
    };

    $scope.etrackerChange = function() {
        $scope.specApi.keepMode();
        var id = $scope.tracker.etrackerSelected;
        if (!id)
            return;
        var info = id.split('|');
        $scope.specInfo.id = info[0];
        $scope.specInfo.projectId = info[1];
        $scope.specInfo.refId = info[2];
        $scope.specInfo.commitId = 'latest';
        $rootScope.ve_tbApi.setPermission('element-editor', true);
    };

    var showPane = function(pane) {
        angular.forEach($scope.show, function(value, key) {
            if (key === pane)
                $scope.show[key] = true;
            else
                $scope.show[key] = false;
        });
    };

    // Check edit count and toggle appropriate save all and edit/edit-asterisk buttons
    var cleanUpSaveAll = function() {
        if ($scope.veEditsLength() > 0) {
            $rootScope.ve_tbApi.setPermission('element-editor-saveall', true);
            $rootScope.ve_tbApi.setIcon('element-editor', 'fa-edit-asterisk');
        } else {
            $rootScope.ve_tbApi.setPermission('element-editor-saveall', false);
            $rootScope.ve_tbApi.setIcon('element-editor', 'fa-edit');
        }
    };

    $scope.$on('jobs', function() {
        showPane('jobs');
    });

    $scope.$on('element-history', function() {
        showPane('history');
    });

    var cleanUpEdit = function(editOb) {
        var key = editOb.sysmlId + '|' + editOb._projectId + '|' + editOb._refId;
        var currentCnt = 0;

        if ($scope.presentElemEditCnts.hasOwnProperty(key)) {
            currentCnt = $scope.presentElemEditCnts[key];
        }
        if (currentCnt <= 1 && !Utils.hasEdits(editOb)) {//TODO Utils.hasEdits
            delete $rootScope.ve_edits[key];
            delete $scope.presentElemEditCnts[key];
            cleanUpSaveAll();
        } else {
            $scope.presentElemEditCnts[key] = currentCnt - 1;
        }
    };

    $scope.$on('presentationElem.edit', function(event, editOb) {
        var key = editOb.sysmlId + '|' + editOb._projectId + '|' + editOb._refId;
        var currentCnt = 1;
        $rootScope.ve_edits[key] = editOb;
        if ($scope.presentElemEditCnts.hasOwnProperty(key)) {
            currentCnt = $scope.presentElemEditCnts[key] + 1;
        }
        $scope.presentElemEditCnts[key] = currentCnt;
        cleanUpSaveAll();
    });

    $scope.$on('presentationElem.save', function(event, editOb) {
        cleanUpEdit(editOb);
    });

    $scope.$on('presentationElem.cancel', function(event, editOb) {
        cleanUpEdit(editOb);           
    });

    var elementSelected = function(event, elementOb, commitId) {
        $scope.specInfo.id = elementOb.sysmlId;
        $scope.specInfo.projectId = elementOb._projectId;
        $scope.specInfo.refId = elementOb._refId;
        $scope.specInfo.commitId = commitId ? commitId : elementOb._commitId;
        $rootScope.ve_tbApi.select('element-viewer');
        if ($rootScope.togglePane && $rootScope.togglePane.closed)
            $rootScope.togglePane.toggle();

        showPane('element');
        if ($scope.specApi.setEditing) {
            $scope.specApi.setEditing(false);
        }
        var editable = elementOb._editable && commitId === 'latest';
        $rootScope.ve_tbApi.setPermission('element-editor', editable);
    };
    $scope.$on('elementSelected', elementSelected);
    $scope.$on('element-viewer', function() {
        $scope.specApi.setEditing(false);
        cleanUpSaveAll();
        showPane('element');
    });
    $scope.$on('element-editor', function() {
        $scope.specApi.setEditing(true);
        showPane('element');
        var editOb = $scope.specApi.getEdits();
        if (editOb) {
            var key = editOb.sysmlId + '|' + editOb._projectId + '|' + editOb._refId;
            $scope.tracker.etrackerSelected = key;
            $rootScope.ve_edits[key] = editOb;
            cleanUpSaveAll();
        }
        ElementService.isCacheOutdated(editOb)
        .then(function(data) {
            if (data.status && data.server._modified > data.cache._modified)
                growl.error('This element has been updated on the server. Please refresh the page to get the latest version.');
        });
    });
    $scope.$on('viewSelected', function(event, elementOb, commitId) {
        elementSelected(event, elementOb, commitId);
        $scope.viewOb = elementOb;
        var editable = elementOb._editable && commitId === 'latest';
        $scope.viewCommitId = commitId ? commitId : elementOb._commitId;
        $rootScope.ve_tbApi.setPermission('view-reorder', editable);
    });

    $scope.$on('view-reorder.refresh', function() {
        $scope.viewOrderApi.refresh();
    });

    $scope.$on('view-reorder', function() {
        $scope.viewOrderApi.setEditing(true);
        showPane('reorder');
    });
    
    var elementSaving = false;
    $scope.$on('element-editor-save', function() {
        save(false);
    });
    $scope.$on('element-editor-saveC', function() {
        save(true);
    });
    var save = function(continueEdit) {
        if (elementSaving) {
            growl.info('Please Wait...');
            return;
        }
        elementSaving = true;
        if (!continueEdit)
            $rootScope.ve_tbApi.toggleButtonSpinner('element-editor-save');
        else
            $rootScope.ve_tbApi.toggleButtonSpinner('element-editor-saveC');
        $timeout(function() {
        $scope.specApi.save().then(function(data) {
            elementSaving = false;
            growl.success('Save Successful');
            if (continueEdit) 
                return;
            var edit = $scope.specApi.getEdits();
            var key = edit.sysmlId + '|' + edit._projectId + '|' + edit._refId;
            delete $rootScope.ve_edits[key];
            if (Object.keys($rootScope.ve_edits).length > 0) {
                var next = Object.keys($rootScope.ve_edits)[0];
                var id = next.split('|');
                $scope.tracker.etrackerSelected = next;
                $scope.specApi.keepMode();
                $scope.specInfo.id = id[0];
                $scope.specInfo.projectId = id[1];
                $scope.specInfo.refId = id[2];
                $scope.specInfo.commitId = 'latest';
            } else {
                $scope.specApi.setEditing(false);
                $rootScope.ve_tbApi.select('element-viewer');
                cleanUpSaveAll();
            }
        }, function(reason) {
            elementSaving = false;
            if (reason.type === 'info')
                growl.info(reason.message);
            else if (reason.type === 'warning')
                growl.warning(reason.message);
            else if (reason.type === 'error')
                growl.error(reason.message);
        }).finally(function() {
            if (!continueEdit)
                $rootScope.ve_tbApi.toggleButtonSpinner('element-editor-save');
            else
                $rootScope.ve_tbApi.toggleButtonSpinner('element-editor-saveC');
        });
        }, 1000, false);
        $rootScope.ve_tbApi.select('element-editor');
    };

    hotkeys.bindTo($scope)
    .add({
        combo: 'alt+a',
        description: 'save all',
        callback: function() {$scope.$broadcast('element-editor-saveall');}
    });
    var savingAll = false;
    $scope.$on('element-editor-saveall', function() {
        if (savingAll) {
            growl.info('Please wait...');
            return;
        }
        if (Object.keys($rootScope.ve_edits).length === 0) {
            growl.info('Nothing to save');
            return;
        }
        if ($scope.specApi && $scope.specApi.editorSave)
            $scope.specApi.editorSave();
        savingAll = true;
        $rootScope.ve_tbApi.toggleButtonSpinner('element-editor-saveall');
        var promises = [];
        angular.forEach($rootScope.ve_edits, function(value, key) {
            var defer = $q.defer();
            promises.push(defer.promise);
            ElementService.updateElement(value)
            .then(function(e) {
                defer.resolve({status: 200, ob: value});
            }, function(reason) {
                defer.resolve({status: reason.status, ob: value});
            });
        });
        $q.all(promises).then(function(results) {
            var somefail = false;
            var failed = null;
            results.forEach(function(ob) {
                if (ob.status === 200) {
                    delete $rootScope.ve_edits[ob.ob.sysmlId + '|' + ob.ob._projectId + '|' + ob.ob._refId];
                    $rootScope.$broadcast('element.updated', ob.ob, 'all');
                } else {
                    somefail = true;
                    failed = ob.ob;
                }
            });
            if (!somefail) {
                growl.success("Save All Successful");
                $rootScope.ve_tbApi.select('element-viewer');
                $scope.specApi.setEditing(false);
            } else {
                $scope.tracker.etrackerSelected = failed.sysmlId + '|' + failed._projectId + '|' + failed._refId;
                $scope.specApi.keepMode();
                $scope.specInfo.id = failed.sysmlId;
                $scope.specInfo.projectId = failed._projectId;
                $scope.specInfo.refId = failed._refId;
                $scope.specInfo.commitId = 'latest';
                growl.error("Some elements failed to save, resolve individually in edit pane");
            }
            $rootScope.ve_tbApi.toggleButtonSpinner('element-editor-saveall');
            savingAll = false;
            cleanUpSaveAll();

            if (Object.keys($rootScope.ve_edits).length === 0) {
                $rootScope.ve_tbApi.setIcon('element-editor', 'fa-edit');
            }
        });
    });
    $scope.$on('element-editor-cancel', function() {
        var go = function() {
            var edit = $scope.specApi.getEdits();
            delete $rootScope.ve_edits[edit.sysmlId + '|' + edit._projectId + '|' + edit._refId];
            $scope.specApi.revertEdits();
            if (Object.keys($rootScope.ve_edits).length > 0) {
                var next = Object.keys($rootScope.ve_edits)[0];
                var id = next.split('|');
                $scope.tracker.etrackerSelected = next;
                $scope.specApi.keepMode();
                $scope.specInfo.id = id[0];
                $scope.specInfo.projectId = id[1];
                $scope.specInfo.refId = id[2];
                $scope.specInfo.commitId = 'latest';
            } else {
                $scope.specApi.setEditing(false);
                $rootScope.ve_tbApi.select('element-viewer');
                $rootScope.ve_tbApi.setIcon('element-editor', 'fa-edit');
                cleanUpSaveAll();
            }
        };
        if ($scope.specApi.hasEdits()) {
            var instance = $uibModal.open({
                templateUrl: 'partials/mms/cancelConfirm.html',
                scope: $scope,
                controller: ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
                    $scope.ok = function() {
                        $uibModalInstance.close('ok');
                    };
                    $scope.cancel = function() {
                        $uibModalInstance.dismiss();
                    };
                }]
            });
            instance.result.then(function() {
                go();
            });
        } else
            go();
    });
    var viewSaving = false;
    $scope.$on('view-reorder-save', function() {
        if (viewSaving) {
            growl.info('Please Wait...');
            return;
        }
        viewSaving = true;
        $rootScope.ve_tbApi.toggleButtonSpinner('view-reorder-save');
        $scope.viewOrderApi.save().then(function(data) {
            viewSaving = false;
            $scope.viewOrderApi.refresh();
            growl.success('Save Succesful');
            $rootScope.ve_tbApi.toggleButtonSpinner('view-reorder-save');
            $rootScope.$broadcast('view.reorder.saved', $scope.viewId);
        }, function(reason) {
            $scope.viewOrderApi.refresh();
            viewSaving = false;
            if (reason.type === 'info')
                growl.info(reason.message);
            else if (reason.type === 'warning')
                growl.warning(reason.message);
            else if (reason.type === 'error')
                growl.error(reason.message);
            $rootScope.ve_tbApi.toggleButtonSpinner('view-reorder-save');
        });
        $rootScope.ve_tbApi.select('view-reorder');
    });
    $scope.$on('view-reorder-cancel', function() {
        $scope.specApi.setEditing(false);
        $scope.viewOrderApi.refresh();
        $rootScope.ve_tbApi.select('element-viewer');
        showPane('element');
    });
}]);