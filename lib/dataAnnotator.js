import Cookies from '/lib/js.cookie.min.mjs';

class SaveStateHandler {
  constructor(canvas) {
    this.saveIndex = 0;
    this.canvas = canvas;
    this.saveStates = [this.canvas.toObject()];
  }

  save() {
    this.saveStates[this.saveIndex + 1] = this.canvas.toObject();
    this.saveIndex++;
    //removes save states in front of the one the user just made
    this.saveStates.splice(this.saveIndex + 1, Infinity);
  }

  step(difference) {

    const range = [0, this.saveStates.length - 1];
    if (this.saveIndex + difference >= range[0] &&
      this.saveIndex + difference <= range[1]) {
      this.saveIndex += difference;
      this.canvas.loadFromJSON(this.saveStates[this.saveIndex]);
    } else {
      $.mSnackbar.add({
        text: '<i style="color: #ff616f">Error:</i> nothing to ' + (difference < 0 ? 'undo' : 'redo'),
      });
    }
  }
}
class SelfIterator {
  constructor() {
    this.innerCount = 0;
  }
  val() {
    this.innerCount++;
    return this.innerCount;
  }
}

$(function () {
  const modes = {
    polygon: 0,
    pen: 1,
    rectangle: 2,
    select: 3,
    eraser: 4
  };
  var controls = {
    delete: 46, //delete key
    backspace: 8,
    undo: 90,
    redo: 89,
    control: 17,
    selectAll: 65
  };
  var mouseControls = {
    left: 0,
    middle: 1,
    right: 2
  };

  var iterator = new SelfIterator();
  var user = {
    mode: modes.select,
    insideCanvas: false
  };
  var keysDown = [];
  var currentAction = {
    active: false,
    persistentSnackbar: $.mSnackbar.add({
      text: 'Welcome! Here are some controls<br><b>Undo/redo</b>: Ctrl + Z/Y<br><b>Delete</b>: Delete/Backspace<br><b>Select All</b>: Ctrl + A',
      lifespan: Infinity
    })
  };
  var annotatee = $('#image-being-annotated');
  var canvas = new fabric.Canvas('image-annotator-canvas');
  annotatee.on('mouseenter', resizeCanvas);
  resizeCanvas();

  var saveHandler = new SaveStateHandler(canvas);

  $('#image-annotator-canvas-wrapper').on('mouseenter', '> div > canvas', handleMouseEnter);
  $('#image-annotator-canvas-wrapper').on('mouseleave', '> div > canvas', handleMouseLeave);
  $('#image-annotator-canvas-wrapper').on('mousedown', '> div > canvas', handleMouseDown);
  $('#image-annotator-canvas-wrapper').on('mousemove', '> div > canvas', handleMouseMove);
  $('#image-annotator-canvas-wrapper').on('mouseup', '> div > canvas', handleMouseUp);

  $(document).on('keydown', handleKeyDown);
  $(document).on('keyup', handleKeyUp);

  $('#annotator-control-panel').on('click', '> input', switchMode);
  $('#submit-button').on('click', serializeAndUploadCanvas);

  window.onresize = resizeCanvas;

  initializeCanvas();

  function initializeCanvas() {
    //overrides the default handling of cursors, such that it is always a crosshair
    fabric.Canvas.prototype.setCursor = function (value) {};

    console.log('Canvas Initialized!');
    // $.mSnackbar.add({//todo change this to be a better way to show new users controls.
    //   text: 'Controls:<br>Delete: delete / backspace<br>Undo/redo: Ctrl + z / Ctrl + y',
    // });
  }

  //resizes and repositions to cover the image chosen.
  function resizeCanvas() {
    canvas.setWidth(annotatee.outerWidth());
    canvas.setHeight(annotatee.outerHeight());
    $('#image-annotator-canvas-wrapper').offset(annotatee.offset());
  }

  function handleMouseDown(e) { //todo undo doesn't work with polygons
    // console.log(e);
    switch (user.mode) {
      case modes.rectangle:
        currentAction.startCoord = [e.offsetX, e.offsetY];
        currentAction.fabricObject = new fabric.Rect({
          selectable: false,
          left: e.offsetX,
          top: e.offsetY,
          width: 0,
          height: 0
        });
        currentAction.active = true;
        canvas.add(currentAction.fabricObject);
        break;

      case modes.polygon:
        if (!currentAction.active) {
          currentAction.active = true;
          currentAction.iterator = new SelfIterator();
          currentAction.fabricObject = new fabric.Polygon(
            [{
              x: e.offsetX,
              y: e.offsetY
            }, {
              x: e.offsetX + 1,
              y: e.offsetY + 1
            }], {
              id: currentAction.id,
              selectable: false,
              strokeWidth: 4,
              fill: '#000000'
            });
        } else {
          if (e.button === mouseControls.left) {

            currentAction.fabricObject.points.push({
              x: e.offsetX,
              y: e.offsetY
            });
            refreshPolygon(currentAction.fabricObject);
          } else {
            currentAction.active = false;
          }
        }
        break;
      default:
        break;
    }

  }

  function handleMouseMove(e) {
    user.insideCanvas = true;
    if (currentAction.active) {
      switch (user.mode) {
        case modes.rectangle:

          currentAction.fabricObject.set({
            width: Math.abs(Math.abs(currentAction.startCoord[0]) - Math.abs(e.offsetX)),
            height: Math.abs(Math.abs(currentAction.startCoord[1]) - Math.abs(e.offsetY))
          });
          canvas.renderAll(); //this is necessary so that the rectangle follows the cursor
          break;
        case modes.polygon:
          //todo
          break;
        default:
          break;
      }
      //todo
    }
  }

  function handleMouseUp(e) {
    const immediatelyCancel = [modes.rectangle];
    switch (user.mode) {
      case modes.rectangle:
        currentAction.fabricObject.setCoords(); //this is necessary to make it selectable in select mode
        break;
      case modes.polygon:
        break;
      case modes.pen:
        break;
      default:
        break;
    }
    //delayed because otherwise it doesn't save the most recent change.
    setTimeout(function () {
      if (immediatelyCancel.indexOf(user.mode) !== -1) {
        currentAction.active = false;
      }
      saveHandler.save(); //todo change this, right now it saves when no changes are made with select mode
    }, 1);
  }

  function handleMouseEnter() {
    user.insideCanvas = true;
  }

  function handleMouseLeave() {
    user.insideCanvas = false;
  }

  function handleKeyDown(e) {
    keysDown[e.which] = true;

    switch (e.which) {
      case controls.delete:
      case controls.backspace:
        for (let object of canvas.getActiveObjects()) {
          canvas.remove(object);
        }
        canvas.discardActiveObject();
        saveHandler.save();
        break;

      case controls.undo:
        if (keysDown[controls.control]) {
          saveHandler.step(-1);
        }
        break;

      case controls.redo:
        if (keysDown[controls.control]) {
          saveHandler.step(1);
        }
        break;
      case controls.selectAll:
        if (keysDown[controls.control]) {
          selectAll();
        }
        if (user.insideCanvas) {
          return false;
        }
        break;
    }
  }

  function handleKeyUp(e) {
    keysDown[e.which] = false;
  }

  //todo right now it just serializes
  function serializeAndUploadCanvas() {
    console.log(canvas.toSVG());
  }

  function switchMode(e) {
    let mode = parseInt(e.target.value);
    user.mode = mode;
    clearMode();
    switch (mode) {
      case modes.select:
        canvas.selection = true;
        for (let object of canvas.getObjects()) {
          object.selectable = true;
        }
        canvas.renderAll();
        break;
      case modes.pen:
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.width = 3; //todo possibly add ui to change brush size
        canvas.freeDrawingBrush.id = 'drawer';

        break;
        // case modes.eraser:
        //   canvas.isDrawingMode = true;
        //   canvas.freeDrawingBrush.width = 10;
        //   canvas.freeDrawingBrush.id = 'erasure';
        //   break;
      case modes.polygon:
        currentAction.persistentSnackbar = $.mSnackbar.add({
          text: 'To use the polygon tool, simply click where you wish to add points<br>To finish a shape, right click',
          lifespan: Infinity,
        });
        break;
      default:
        break;
    }

    function clearMode() {
      try {
        currentAction.persistentSnackbar.close();
      } catch (e) {
        console.log('no snackbar created yet (probably)');
      }
      currentAction.active = false;
      canvas.selection = false;
      canvas.isDrawingMode = false;
      canvas.discardActiveObject();
      for (let object of canvas.getObjects()) {
        object.selectable = false;
      }
    }
  }

  function refreshPolygon(polygon) {
    //WARNING below might cause issues eventually.
    //It's a little spaghetti-y
    //for some reason, canvas.remove(polygon); didn't work, so I just changed it to that
    // the iterator is necessary because for some reason the newest added path doesn't count as the last object for the first time it is added? Maybe it's because it's a 1d polygon, so it isn't included because it doesn't display anything
    if (currentAction.iterator.val() > 1) {
      canvas.remove(canvas.getObjects()[canvas.getObjects().length - 1]);
    }

    var tempObj = polygon.toObject();
    delete tempObj.top;
    delete tempObj.left;
    polygon = new fabric.Polygon(polygon.points, tempObj);
    canvas.add(polygon);
  }

  function changeCursor(cursor) {
    $('.canvas-container > canvas').css('cursor', cursor);
  }

  function selectAll() {
    canvas.discardActiveObject();
    var sel = new fabric.ActiveSelection(canvas.getObjects(), {
      canvas: canvas,
    });
    canvas.setActiveObject(sel);
    canvas.requestRenderAll();
  }
});

//todo
/**
 * goals:
 *  Drawing of paths, rectangles, polygons through different modes
 *  Upload data to server. Possibly make it just download it for now, as you don't have all the necessary information
 *  
 * There is a bit of a problem with hosting, namely that 
 * Possible solution to hosting problems:
 *  We use the byu box thingy for hosting the images, as they are quite large.
 *  I don't think that we're going to have a whole lot of users, so we use firebase to handle storing the svg data the users create, as well as choosing which images to serve to which users.
 */
//todo possibly use the built in events in fabric.js to handle creation of rectangles and the such.
//if that doesn't work, you can use mousedown and mouseup events as opposed to the click event. More intuitive as to how a drawing program would work.
