
/**
 * @fileoverview Scene dragging.
 *
 * @author slouppetr@gmail.com (Petr Sloup)
 * @author petr.pridal@klokantech.com (Petr Pridal)
 *
 */

goog.provide('we.scene.Dragger');

goog.require('goog.events');
goog.require('goog.fx.Animation');
goog.require('goog.fx.easing');

goog.require('goog.math');

goog.require('goog.ui.Component.EventType');
goog.require('we.scene.Scene');


/**
 * Creates new dragger for the given scene.
 * @param {!we.scene.Scene} scene Scene.
 * @constructor
 */
we.scene.Dragger = function(scene) {
  /**
   * @type {!we.scene.Scene}
   * @private
   */
  this.scene_ = scene;

  /**
   * @type {boolean}
   * @private
   */
  this.dragging_ = false;

  /**
   * @type {number}
   * @private
   */
  this.oldX_ = 0;

  /**
   * @type {number}
   * @private
   */
  this.oldY_ = 0;

  /**
   * @type {number}
   * @private
   */
  this.dragEndX_ = 0;

  /**
   * @type {number}
   * @private
   */
  this.dragEndY_ = 0;

  /**
   * @type {?number}
   * @private
   */
  this.listenKey_ = null;

  /**
   * @type {goog.Timer}
   * @private
   */
  this.dragEndTimer_ = new goog.Timer(20);

  /**
   * @type {goog.fx.Animation}
   * @private
   */
  this.inertialAnimation_ = null;

  goog.events.listen(this.scene_.context.canvas,
                     goog.events.EventType.MOUSEDOWN,
                     goog.bind(this.onMouseDown_, this));

  goog.events.listen(goog.dom.getOwnerDocument(this.scene_.context.canvas),
                     goog.events.EventType.MOUSEUP,
                     goog.bind(this.onMouseUp_, this));

  goog.events.listen(this.dragEndTimer_,
      goog.Timer.TICK,
      this.onDragEndTick_, false, this);
};


/**
 * @param {!goog.events.BrowserEvent} e Event object.
 * @private
 */
we.scene.Dragger.prototype.onMouseDown_ = function(e) {
  if (e.isButton(goog.events.BrowserEvent.MouseButton.LEFT)) {

    // Stop inertial animation
    if (this.inertialAnimation_) {
      this.inertialAnimation_.stop(false);
      this.inertialAnimation_.disposeInternal();
      this.inertialAnimation_ = null;
    }

    this.dragging_ = true;
    this.oldX_ = e.offsetX;
    this.oldY_ = e.offsetY;
    this.listenKey_ = null;

    //if (goog.DEBUG)
    //  we.scene.Scene.logger.info('Registering MOUSEMOVE');

    //Register onMouseMove_
    this.listenKey_ = goog.events.listen(
        goog.dom.getOwnerDocument(this.scene_.context.canvas),
        goog.events.EventType.MOUSEMOVE,
        goog.bind(this.onMouseMove_, this));

    e.preventDefault();

  }
};


/**
 * @param {!goog.events.BrowserEvent} e Event object.
 * @private
 */
we.scene.Dragger.prototype.onMouseUp_ = function(e) {
  if (this.dragging_ && (e.type != goog.events.EventType.MOUSEDOWN ||
      e.isButton(goog.events.BrowserEvent.MouseButton.LEFT))) {
    this.dragging_ = false;

    this.dragEndX_ = e.offsetX;
    this.dragEndY_ = e.offsetY;

    e.preventDefault();

    this.dragEndTimer_.start();
  }
};

/**
 * Move the scene in fiven direction defined in actial window pixel coordinates
 * @param {number} xDiff Difference of position in pixels in x-axis.
 * @param {number} yDiff Difference of position in pixels in y-axis.
 * @private
 */
we.scene.Dragger.prototype.scenePixelMove_ = function(xDiff, yDiff) {

  //TODO: more exact calculation (just vertically?)
  //PI * (How much is 1px on the screen?) * (How much is visible?)
  var factor = Math.PI * (1 / this.scene_.context.canvas.height) *
      (we.scene.TILES_VERTICALLY / Math.pow(2, this.scene_.zoomLevel));

  this.scene_.longitude = this.scene_.longitude - xDiff * 2 * factor;
  this.scene_.latitude = this.scene_.latitude + yDiff * factor;


  if (Math.abs(this.scene_.latitude) > Math.PI / 2.1) {
    this.scene_.latitude = goog.math.sign(this.scene_.latitude) *
        (Math.PI / 2.1);
  }

  if (this.scene_.longitude > Math.PI) {
    this.scene_.longitude -= 2 * Math.PI;
  }

  if (this.scene_.longitude < -Math.PI) {
    this.scene_.longitude += 2 * Math.PI;
  }
};

/**
 * @param {!goog.events.BrowserEvent} e Event object.
 * @private
 */
we.scene.Dragger.prototype.onMouseMove_ = function(e) {

  var xDiff = e.offsetX - this.oldX_;
  var yDiff = e.offsetY - this.oldY_;

  this.scenePixelMove_(xDiff, yDiff);

  this.oldX_ = e.offsetX;
  this.oldY_ = e.offsetY;

  e.preventDefault();
};


/**
 * Method fired 20ms after MOUSEUP event. It calculates the move direction
 * and lenght and starts the inertial animation.
 * @param {!goog.events.BrowserEvent} e Event object.
 * @private
 */
we.scene.Dragger.prototype.onDragEndTick_ = function(e) {

  this.dragEndTimer_.stop();

  //Unregister onMouseMove_
  if (!goog.isNull(this.listenKey_)) {
    //if (goog.DEBUG)
    //  we.scene.Scene.logger.info('Unregistering MOUSEMOVE');
    goog.events.unlistenByKey(this.listenKey_);
  }

  var xDiff = this.oldX_ - this.dragEndX_;
  var yDiff = this.oldY_ - this.dragEndY_;

  // Initialize the inertial move
  var diffLength = Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2));

  if (diffLength > 10) {

    var xFactor = xDiff / Math.max(Math.abs(xDiff), Math.abs(yDiff));
    var yFactor = yDiff / Math.max(Math.abs(xDiff), Math.abs(yDiff));

    if (diffLength < 50)
      this.inertialStart_(500 * xFactor, 500 * yFactor);
    else if (diffLength < 100)
      this.inertialStart_(1000 * xFactor, 100 * yFactor);
      else
        this.inertialStart_(1500 * xFactor, 1500 * yFactor);
  }

};

/**
 * Inertial scrolling (aka kinetic scrolling) animation with easing
 * @param {number} xDiff Difference of position in pixels in x-axis.
 * @param {number} yDiff Difference of position in pixels in y-axis.
 * @param {number} opt_duration Duration of the animation.
 * @private
 */
we.scene.Dragger.prototype.inertialStart_ =
    function(xDiff, yDiff, opt_duration) {

  var duration = opt_duration || 1300;

  this.inertialAnimation_ = new goog.fx.Animation(
      [this.dragEndX_, this.dragEndY_],
      [this.dragEndX_ + xDiff, this.dragEndY_ + yDiff],
      duration, goog.fx.easing.easeOut);

  goog.events.listen(this.inertialAnimation_,
      [goog.fx.Animation.EventType.ANIMATE],
      this.inertialMoveTick_, false, this);
  this.inertialAnimation_.play(false);
};


/**
 * The animation tick for inertial scrolling
 * @param {!goog.events.BrowserEvent} e Event object.
 * @private
 */
we.scene.Dragger.prototype.inertialMoveTick_ = function(e) {
  this.scenePixelMove_(e.x - this.oldX_, e.y - this.oldY_);
  this.oldX_ = e.x;
  this.oldY_ = e.y;
};
