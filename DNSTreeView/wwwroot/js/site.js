var selectedRow = null;
var rootDirectoryId = null;
var loadedDirectoryIds = [];
var dragElement = null;
const API = 'Index?handler=';

// Функция отправки POST запроса
async function postData(url = '', data = {}) {
    const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        },
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(data)
    });
    return response.json();
}

/*
 * Методы API
 */
async function apiLoadDirectory(IdDirectory, IsSortByName) {
    return postData(API + 'LoadDirectory', {
        IdDirectory: IdDirectory,
        IsSortByName: IsSortByName
    });
}
async function apiAddItem(Name, Size, IdParentDirectory) {
    return postData(API + 'AddItem', {
        Name: Name,
        Size: Size,
        IdParentDirectory: IdParentDirectory
    });
}
async function apiMoveItem(IdDirectory, IdFile, IdParentDirectory) {
    return postData(API + 'MoveItem', {
        IdDirectory: IdDirectory,
        IdFile: IdFile,
        IdParentDirectory: IdParentDirectory
    });
}
/** 
 */

// Принудительное добавления кнопки сворачивания/разворачивания папки
function setDirectoryDecoration(rowElement) {
    if (rowElement.getElementsByClassName('row-caret').length === 0) {
        var Name = rowElement.getElementsByClassName('row-text')[0].innerHTML;
        var rowCaretElement = document.createElement('i');
        rowCaretElement.id = 'row_caret_' + itemIdFromRowElement(rowElement);
        rowCaretElement.classList.add('fa');
        rowCaretElement.classList.add('fa-caret-right');
        rowCaretElement.classList.add('row-caret');
        rowCaretElement.classList.add('fa-fw');
        var rowSpaces = [];
        var level = rowElementLevel(rowElement);
        while (rowSpaces.length < level)
            rowSpaces.push('<td class="row-space" />');
        rowElement.innerHTML = '<tbody draggable="true"><tr>' +
            rowSpaces.join('') +
            '<td class="row-icon-space">' + rowCaretElement.outerHTML + '</td>' +
            '<td class="row-icon-space"><i class="far fa-folder row-icon"></i></td><td>' +
            '<span class="row-text">' + Name + '</span></td><td><span class="row-text-gray" /></td></tr></tbody >';
        document.getElementById(rowCaretElement.id).onclick = (ev) => { rowToggle(rowElementFromChild(ev.path)); };
    }
}

// Функция возвращающая корневой элемент строки, в которой отрисована папка/файл
function rowElementFromChild(path) {
    for (var i = 0; i < path.length; i++) {
        if (path[i].tagName === 'TABLE')
            return path[i];
    }

    return null;
}
// Функция возвращающая Id папки/файла
function itemIdFromRowElement(rowElement) {
    if (rowElement) {
        return rowElement.id.split('_').slice(-1)[0];
    }

    return null;
}
// Функция возвращающая уровень строки
function rowElementLevel(rowElement) {
    return rowElement.getElementsByClassName('row-space').length;
}
// Функция проверяющая открыта ли папка
function rowElementIsOpenedDirectory(rowElement) {
    var rowCarets = rowElement.getElementsByClassName('row-caret');

    return (rowCarets.length > 0 && rowCarets[0].classList.contains('fa-caret-down'));
}
// Функция проверяющая является ли элемент папкой
function rowElementIsDirectory(rowElement) {
    var rowIcon = rowElement.getElementsByClassName('row-icon')[0];

    return !rowIcon.classList.contains('fa-file');
}
// Функция возвращающая родительскую папку
function rowElementParentDirectory(rowElement) {
    var level = rowElementLevel(rowElement);

    rowElement = rowElement.previousElementSibling;
    while (rowElement)
        if (level > rowElementLevel(rowElement))
            break;
        else
            rowElement = rowElement.previousElementSibling;

    return rowElement;
}
// Функция проверяющая принадлежит ли объект этой папке или её подпапкам
function rowElementIsInDirectory(rowElement, directoryElementId) {
    do {
        if (rowElement.id === directoryElementId)
            return true;

        rowElement = rowElementParentDirectory(rowElement);
    } while (rowElement);

    return false;
}

// Процедура обновления содержимого папки
function refreshDirectory(directoryElement) {
    if (directoryElement) {
        unloadDirectory(directoryElement);
        loadDirectory(directoryElement);
    }
}
// Процедура нажатия на элемент дерева -> выделение
function rowSelectionClick(rowElement) {
    if (selectedRow && selectedRow !== rowElement) {
        selectedRow.classList.remove('row-item-selected');
        selectedRow = null;
    }

    if (!rowElement.classList.contains('row-item-selected')) {
        selectedRow = rowElement;
        rowElement.classList.add('row-item-selected');
    }
}
// Процедура нажатия на папку -> загрузить/скрыть содержимое
function rowToggle(rowElement) {
    var rowCaret = rowElement.getElementsByClassName('row-caret')[0];
    var rowIcon = rowElement.getElementsByClassName('row-icon')[0];

    if (rowCaret.classList.contains('fa-caret-right')) {
        rowCaret.classList.remove('fa-caret-right');
        rowCaret.classList.add('fa-caret-down');
        rowIcon.classList.remove('fa-folder');
        rowIcon.classList.add('fa-folder-open');

        if (loadedDirectoryIds.indexOf(rowElement.id) > -1)
            hideShowDirectorySubElements(rowElement);
        else
            loadDirectory(rowElement);
    }
    else {
        rowCaret.classList.remove('fa-caret-down');
        rowCaret.classList.add('fa-caret-right');
        rowIcon.classList.remove('fa-folder-open');
        rowIcon.classList.add('fa-folder');
        hideShowDirectorySubElements(rowElement);
    }
}

// Процедура выгрузки всех дочерних элементов
function unloadDirectory(rowElement) {
    var level = rowElementLevel(rowElement);

    var maybeChildElement = rowElement.nextElementSibling;
    while (maybeChildElement)
        if (level < rowElementLevel(maybeChildElement)) {
            treeView.removeChild(maybeChildElement);
            maybeChildElement = rowElement.nextElementSibling;
        }
        else maybeChildElement = null;

    const index = loadedDirectoryIds.indexOf(rowElement.id);
    if (index > -1) {
        loadedDirectoryIds.splice(index, 1);
    }
}
// Процедура скрытия/показа дочерних элементов
function hideShowDirectorySubElements(rowElement) {
    var level = rowElementLevel(rowElement);

    var maybeChildElement = rowElement.nextElementSibling;
    while (maybeChildElement)
        if (level < rowElementLevel(maybeChildElement)) {
            maybeChildElement.hidden = !maybeChildElement.hidden;
            if (rowElementIsDirectory(maybeChildElement) && !rowElementIsOpenedDirectory(maybeChildElement)) {
                var subDirLevel = rowElementLevel(maybeChildElement);
                do {
                    maybeChildElement = maybeChildElement.nextElementSibling;
                } while (subDirLevel < rowElementLevel(maybeChildElement));
            }
            else maybeChildElement = maybeChildElement.nextElementSibling;
        }
        else maybeChildElement = null;
}

/*
 * События перетаскивания
 */
function dragStart(ev) {
    ev.dataTransfer.effectAllowed = 'move';
    dragElement = rowElementFromChild(ev.path);
    rowSelectionClick(dragElement);
    return true;
};
function dragEnter(ev) {
    //ev.preventDefault();

    var allowed = (rowElementIsDirectory(ev.currentTarget) && !rowElementIsInDirectory(ev.currentTarget, dragElement.id));
    ev.dataTransfer.dropEffect = allowed ? 'move' : 'none';
    if (selectedRow && ev.currentTarget.id !== selectedRow.id)
        ev.currentTarget.style.background = "rgba(50, 114, 200, 0.15)";
    return allowed;
}
function dragOver(ev) {
    ev.preventDefault();
    var allowed = (rowElementIsDirectory(ev.currentTarget) && !rowElementIsInDirectory(ev.currentTarget, dragElement.id));
    ev.dataTransfer.dropEffect = allowed ? 'move' : 'none';
    if (selectedRow && ev.currentTarget.id !== selectedRow.id)
        ev.currentTarget.style.background = "rgba(50, 114, 200, 0.15)";
}
function dragLeave(ev) {
    if (selectedRow && ev.currentTarget.id !== selectedRow.id)
        ev.currentTarget.style = "initial";
}
function drop(ev) {
    var rowElement = ev.currentTarget;
    if (rowElementIsDirectory(rowElement) && !rowElementIsInDirectory(rowElement, dragElement.id)) {
        var IdDirectory = null;
        var IdFile = null;
        if (rowElementIsDirectory(dragElement))
            IdDirectory = itemIdFromRowElement(dragElement);
        else
            IdFile = itemIdFromRowElement(dragElement);
        spinner.style.display = 'initial';
        apiMoveItem(IdDirectory, IdFile, itemIdFromRowElement(rowElement)).then((data) => {
            var result = JSON.parse(data);
            if (result.ErrorText === null || result.ErrorText.length === 0) {
                setDirectoryDecoration(rowElement);
                /*
                if (rowElement.getElementsByClassName('row-caret').length === 0) {
                    var Name = rowElement.getElementsByClassName('row-text')[0].innerHTML;
                    var rowCaretElement = null;
                    rowCaretElement = document.createElement('i');
                    rowCaretElement.id = 'row_caret_' + itemIdFromRowElement(rowElement);
                    rowCaretElement.classList.add('fa');
                    rowCaretElement.classList.add('fa-caret-right');
                    rowCaretElement.classList.add('row-caret');
                    rowCaretElement.classList.add('fa-fw');
                    var rowSpaces = [];
                    var level = rowElementLevel(rowElement);
                    while (rowSpaces.length < level)
                        rowSpaces.push('<td class="row-space" />');
                    rowElement.innerHTML = '<tbody draggable="true"><tr>' +
                        rowSpaces.join('') +
                        '<td class="row-icon-space">' + rowCaretElement.outerHTML + '</td>' +
                        '<td class="row-icon-space"><i class="far fa-folder row-icon"></i></td><td>' +
                        '<span class="row-text">' + Name + '</span></td><td><span class="row-text-gray" /></td></tr></tbody >';
                    document.getElementById(rowCaretElement.id).onclick = (ev) => { rowToggle(rowElementFromChild(ev.path)); };
                }*/
                var dragElement = selectedRow;
                if (IdDirectory) {
                    selectedRow = null;
                    unloadDirectory(dragElement);
                }
                treeView.removeChild(dragElement);

                unloadDirectory(rowElement);
                if (rowElementIsOpenedDirectory(rowElement))
                    loadDirectory(rowElement);
                else
                    rowToggle(rowElement);
            }
            else {
                errorDialogText.innerHTML = result.ErrorText;
                errorDialog.style.display = 'initial';
            }
            spinner.style.display = 'none';
        });
    }

    rowElement.style = "initial";
    dragElement = null;

    return false;
}
/**
 */

/*
 * События нажатия на кнопки панели инструметов
 */
function addDirectoryEvent(ev) {
    ev.preventDefault();

    if (selectedRow) {
        itemName.value = "";
        fileSize.value = 0;

        addItemDialogTitle.innerHTML = 'Добавление папки';
        fileSizeGroup.hidden = true;
        addItemDialog.style.display = 'initial';
    }
}
function addFileEvent(ev) {
    ev.preventDefault();

    if (selectedRow) {
        itemName.value = "";
        fileSize.value = 0;

        addItemDialogTitle.innerHTML = 'Добавление файла';
        fileSizeGroup.hidden = false;
        addItemDialog.style.display = 'initial';
    }
}
function refreshDirectoryEvent(ev) {
    ev.preventDefault();

    var rowElement = selectedRow;
    if (!rowElementIsDirectory(rowElement))
        rowElement = rowElementParentDirectory(rowElement);
    if (!rowElementIsOpenedDirectory(rowElement))
        rowElement = rowElementParentDirectory(rowElement);

    refreshDirectory(rowElement);
}
function sortChengedEvent(ev) {
    console.info(sort_by, ev);

    refreshDirectory(rowElementParentDirectory(selectedRow));
}
/** 
 */

/*
 * События в диалоговом окне
 */
function dialogOuterClick(ev, dialogWindow) {
    if (ev.path[0].id === dialogWindow.id)
        dialogWindow.style.display = 'none';
}
function addItemButtonClick(ev) {
    ev.preventDefault();

    var rowElement = selectedRow;
    if (!rowElementIsDirectory(rowElement))
        rowElement = rowElementParentDirectory(rowElement);

    var IdDirectory = itemIdFromRowElement(rowElement);
    spinner.style.display = 'initial';
    apiAddItem(itemName.value, (fileSize.hidden ? null : fileSize.value), IdDirectory).then((data) => {
        addItemDialog.style.display = 'none';

        var result = JSON.parse(data);
        if (result.ErrorText === null || result.ErrorText.length === 0) {
            setDirectoryDecoration(rowElement);

            unloadDirectory(rowElement);
            if (rowElementIsOpenedDirectory(rowElement))
                loadDirectory(rowElement);
            else
                rowToggle(rowElement);
        }
        else {
            errorDialogText.innerHTML = result.ErrorText;
            errorDialog.style.display = 'initial';
        }
        spinner.style.display = 'none';
    });
}
function closeDialogClick(ev, dialogWindow) {
    ev.preventDefault();

    dialogWindow.style.display = 'none';
}
/** 
 */

// Функция загрузки содержимого папки
function loadDirectory(directoryElement) {
    spinner.style.display = 'initial';
    var IdDirectory = itemIdFromRowElement(directoryElement);
    var IsSortByName = (sort_by.selectedIndex === 0)
    apiLoadDirectory(IdDirectory, IsSortByName).then((data) => {
        var result = JSON.parse(data);

        // Выставляем флаг hidden в значение истина если загружаемая папка находится в закрытом состоянии
        const hidden = directoryElement && !rowElementIsOpenedDirectory(directoryElement);
        //
        var insertBeforeRowElement = null
        var rowSpaces = [];
        if (directoryElement) {
            if (loadedDirectoryIds.indexOf(directoryElement.id) === -1)
                loadedDirectoryIds.push(directoryElement.id);
            var level = rowElementLevel(directoryElement) + 1;
            while (rowSpaces.length < level)
                rowSpaces.push('<td class="row-space" />');

            insertBeforeRowElement = directoryElement.nextElementSibling;
        }

        // При первой загрузке добавляется корневой элемент дерева и флаг openDirOnLoad выставляется в значение истина для вызова автоматической загрузки содержимого корневого элемента
        const openDirOnLoad = (rootDirectoryId === null);
        // Прорисовка папок
        for (var i = 0; i < result.Directories.length; i++) {
            var rowId = result.Directories[i].IdDirectory;
            if (!rootDirectoryId)
                rootDirectoryId = rowId;

            var rowCaretElement = null;
            if (result.Directories[i].HasSubItems) {
                rowCaretElement = document.createElement('i');
                rowCaretElement.id = 'row_caret_' + rowId;
                rowCaretElement.classList.add('fa');
                rowCaretElement.classList.add('fa-caret-right');
                rowCaretElement.classList.add('row-caret');
                rowCaretElement.classList.add('fa-fw');
            }

            var rowElement = document.createElement('table');
            rowElement.id = 'row_d_' + rowId;
            rowElement.hidden = hidden;
            rowElement.innerHTML = '<tbody draggable="true"><tr>' +
                rowSpaces.join('') +
                '<td class="row-icon-space">' + (rowCaretElement ? rowCaretElement.outerHTML : '') + '</td>' +
                '<td class="row-icon-space"><i class="far fa-folder row-icon"></i></td><td>' +
                '<span class="row-text">' + result.Directories[i].Name + '</span></td><td><span class="row-text-gray" /></td></tr></tbody >';
            rowElement.classList.add('row-item');
            if (!insertBeforeRowElement)
                treeView.append(rowElement);
            else
                treeView.insertBefore(rowElement, insertBeforeRowElement);

            rowElement = document.getElementById(rowElement.id);
            // Подключаем событие нажатия на строку элемента
            rowElement.onclick = (ev) => { rowSelectionClick(rowElementFromChild(ev.path)); };
            // Подключаем событие нажатия на кнопку показа содержимого папки
            if (rowCaretElement)
                document.getElementById(rowCaretElement.id).onclick = (ev) => { rowToggle(rowElementFromChild(ev.path)); };

            rowElement.ondrag = (ev) => { };
            rowElement.ondragstart = (ev) => { return dragStart(ev); };
            rowElement.ondragenter = (ev) => { return dragEnter(ev); };
            rowElement.ondragover = (ev) => { dragOver(ev); };
            rowElement.ondragleave = (ev) => { dragLeave(ev); };
            rowElement.ondrop = (ev) => { return drop(ev); };

            if (loadedDirectoryIds.indexOf(rowElement.id) > -1)
                loadDirectory(rowElement);
        }
        // Прорисовка файлов
        for (var i = 0; i < result.Files.length; i++) {
            var rowId = result.Files[i].IdFile;

            var rowElement = document.createElement('table');
            rowElement.id = 'row_f_' + rowId;
            rowElement.hidden = hidden;
            rowElement.innerHTML = '<tbody draggable="true"><tr>' +
                rowSpaces.join('') +
                '<td class="row-icon-space"></td>' +
                '<td class="row-icon-space"><i class="far fa-file row-icon"></i></td><td>' +
                '<span class="row-text">' + result.Files[i].Name + '</span></td><td style="width: 100px"><span class="row-text-gray">' + result.Files[i].Size + ' байт</span></td></tr></tbody >';
            rowElement.classList.add('row-item');
            if (!insertBeforeRowElement)
                treeView.append(rowElement);
            else
                treeView.insertBefore(rowElement, insertBeforeRowElement);

            rowElement = document.getElementById(rowElement.id);
            // Подключаем событие нажатия на строку элемента
            rowElement.onclick = (ev) => { console.info(ev.path); rowSelectionClick(rowElementFromChild(ev.path)); };

            rowElement.ondrag = (ev) => { };
            rowElement.ondragstart = (ev) => { return dragStart(ev); };
            rowElement.ondragenter = (ev) => { return dragEnter(ev); };
            rowElement.ondragover = (ev) => { dragOver(ev); };
            rowElement.ondragleave = (ev) => { dragLeave(ev); };
            rowElement.ondrop = (ev) => { return drop(ev); };
        }
        spinner.style.display = 'none';

        // При первой загрузке страницы прогружаем содержимое корневой папки
        if (openDirOnLoad) rowToggle(document.getElementById('row_d_' + rootDirectoryId))
    });
}

document.onreadystatechange = (ev) => {
    if (document.readyState === 'complete') {

        // Событие нажатия на кнопку добавления папки
        add_directory.onclick = (ev) => { addDirectoryEvent(ev); };
        // Событие нажатия на кнопку добавления файла
        add_file.onclick = (ev) => { addFileEvent(ev); };
        // Событие нажатия на кнопку обновления содержимого папки
        refresh_directory.onclick = (ev) => { refreshDirectoryEvent(ev); };
        // Событие выбора типа сортировки
        sort_by.onchange = (ev) => { sortChengedEvent(ev); };

        addItemDialog.onclick = (ev) => { dialogOuterClick(ev, addItemDialog); };
        btnAddItem.onclick = (ev) => { addItemButtonClick(ev); };
        btnCloseAddItemDialog.onclick = (ev) => { closeDialogClick(ev, addItemDialog); };
        btnCancelAddItemDialog.onclick = (ev) => { closeDialogClick(ev, addItemDialog); };

        errorDialog.onclick = (ev) => { dialogOuterClick(ev, errorDialog); };
        btnCloseErrorDialog.onclick = (ev) => { closeDialogClick(ev, errorDialog); };
        btnClose.onclick = (ev) => { closeDialogClick(ev, errorDialog); };

        loadDirectory(null);
    }
}
