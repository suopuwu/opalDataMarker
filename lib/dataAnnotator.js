$(function () {
  const modes = {
    polygon: 0,
    pen: 1,
    rectangle: 2,
    select: 3
  };
  var controls = {
    delete: 46 //delete key
  };
  var selfIterator = function () {
    var internalCount = 0;
    return function () {
      internalCount++;
      return internalCount;
    };
  }();
  var user = {
    mode: modes.select
  };
  var keysDown = [];

  var annotatee = $('#image-being-annotated');
  var canvas = new fabric.Canvas('image-annotator-canvas');
  annotatee.on('mouseenter', resizeCanvas);


  $('#image-annotator-canvas-wrapper').on('mousedown', '> div > canvas', handleMouseDown);
  $('#image-annotator-canvas-wrapper').on('mouseup', '> div > canvas', handleMouseMove);
  $('#image-annotator-canvas-wrapper').on('mousemove', '> div > canvas', handleMouseUp);
  $(document).on('keydown', handleKeyDown);
  $(document).on('keyup', handleKeyUp);
  $('#annotator-control-panel').on('click', '> input', switchMode);
  $('#submit-button').on('click', serializeAndUploadCanvas);
  window.onresize = resizeCanvas;
  initializeCanvas();

  function initializeCanvas() {
    canvas.defaultCursor = 'crosshair';
    canvas.selection = false;
    //overrides the default handling of cursors, such that it is always a crosshair
    fabric.Canvas.prototype.setCursor = function (value) {};

    console.log('Canvas Initialized!');
  }

  //resizes and repositions to cover the image chosen.
  function resizeCanvas() {
    canvas.setWidth(annotatee.outerWidth());
    canvas.setHeight(annotatee.outerHeight());
    $('#image-annotator-canvas-wrapper').offset(annotatee.offset());
  }

  function handleMouseDown(e) {
    console.log(e);
    switch (user.mode) {
      case modes.rectangle:
        var rectangle = new fabric.Rect({
          selectable: false,
          left: e.offsetX,
          top: e.offsetY,
          width: 100,
          height: 100
        });
        canvas.add(rectangle);
        break;
      case modes.polygon:
        //todo
        break;
      default:
        break;
    }

  }

  function handleMouseMove(e) {
    //todo
  }

  function handleMouseUp(e) {
    //todo
  }

  function handleKeyDown(e) {
    keysDown[e.which] = true;
    console.log(e.which);
    switch (e.which) {
      case controls.delete:
        for (let object of canvas.getActiveObjects()) {
          canvas.remove(object);
        }
        canvas.discardActiveObject();
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

  function switchMode(event) {
    let mode = parseInt(event.target.value);
    user.mode = mode;

    switch (mode) {
      case modes.select:
        clearMode();
        canvas.selection = true;
        for (let object of canvas.getObjects()) {
          object.selectable = true;
        }
        break;
      case modes.pen:
        // clearMode();
        canvas.isDrawingMode = true;
        console.log(canvas.isDrawingMode);
        break;
      default:
        clearMode();
        break;
    }

    function clearMode() {
      canvas.selection = false;
      canvas.isDrawingMode = false;
      canvas.discardActiveObject();
      for (let object of canvas.getObjects()) {
        object.selectable = false;
      }
    }
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