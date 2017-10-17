'use strict'
////////////////////////////////////////////////////////////////////////////////
/*global THREE, Coordinates, document, window  */
var camera, scene, renderer, cameraControls, canvasWidth, canvasHeight,
    plane, surfacePointBall, center, line, lineGeom, rayObject,
    lineMat, gui, params, mat, centroid, m, 
    intersects;
var objects = [];
var redBalls = [];
var iplane = new THREE.Plane(),
mouse = new THREE.Vector2(),
offset = new THREE.Vector3(),
intersection = new THREE.Vector3(), INTERSECTED, SELECTED; // for grabbing

var projector = new THREE.Projector();
var raycaster = new THREE.Raycaster();
var clock = new THREE.Clock();
var regressionVector = new THREE.Vector3(0, 1, 0);

function fillScene() {
  // Set up gui sliders
  gui = new dat.GUI({
		autoPlace: false,
    height : (32 * 3)- 1
	});
  
	params = {
		redBalls: 5
	}
  
  gui.add(params, 'redBalls').min(3).max(7).step(1).name('Red Balls');
	gui.domElement.style.position = "absolute";
	gui.domElement.style.top = "0";
	gui.domElement.style.right = "0";

	scene = new THREE.Scene();
	scene.fog = new THREE.Fog( 0x808080, 2000, 4000 );
	scene.add( new THREE.AmbientLight( 0x222222 ) );

	var light = new THREE.DirectionalLight( 0xffffff, 0.9 );
	light.position.set( -200, 500, 500 );
	scene.add( light );

	light = new THREE.DirectionalLight( 0xffffff, 0.6 );
	light.position.set( 100, 100, -400 );
	scene.add( light );

  //grid xz
  var gridXZ = new THREE.GridHelper(2000, 100, new THREE.Color(0xCCCCCC), new THREE.Color(0x888888));
  scene.add(gridXZ);
  
  //axes
  var axes = new THREE.AxisHelper(150);
  axes.position.y = 1;
  scene.add(axes);

  drawObjects();
  addToDOM();
  animate();
}

function drawObjects() {
  rayObject = new THREE.Object3D();
  
  var redMat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
  
  for ( var i = 0; i < params.redBalls; i++ ){
    var newBall = new THREE.Mesh( new THREE.SphereGeometry(30, 12, 12), redMat);
    newBall.class = -1;
    redBalls.push(newBall);
    objects.push(newBall);
    scene.add(newBall)
    newBall.position.y = i * 70;
  }
  
  var grayMat = new THREE.MeshLambertMaterial({ color: 0x7f7f7f });
  var grayBall1 = new THREE.Mesh( new THREE.SphereGeometry(30, 12, 12), grayMat);
  objects.push(grayBall1);
  grayBall1.position.y = -100;
  scene.add(grayBall1);
  
  var grayBall2 = new THREE.Mesh( new THREE.SphereGeometry(30, 12, 12), grayMat);
  objects.push(grayBall2);
  grayBall2.position.addVectors(
    grayBall1.position, 
    regressionVector.clone().multiplyScalar(450));
  scene.add(grayBall2);
  
  var yellowMat = new THREE.MeshLambertMaterial({ color: 0xffff00 });
  centroid = new THREE.Mesh( new THREE.SphereGeometry(15, 12, 12), yellowMat);
  objects.push(centroid);
  scene.add(centroid);
  
  lineMat = new THREE.LineBasicMaterial({
	   color: 0x000000
  });
  
  lineGeom= new THREE.Geometry();
  lineGeom.vertices.push(
  	  grayBall1.position,
      grayBall2.position
    );
  line = new THREE.Line( lineGeom, lineMat );
  scene.add(line)
}

function init() {
	canvasWidth = 600;
	canvasHeight = 400;


	var canvasRatio = canvasWidth / canvasHeight;

	// RENDERER
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	renderer.setSize(canvasWidth, canvasHeight);
	renderer.setClearColor( 0xAAAAAA, 1.0 );
  renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
  renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
  renderer.domElement.addEventListener( 'mouseup', onDocumentMouseUp, false );
  renderer.setPixelRatio( window.devicePixelRatio );

	// CAMERA
	camera = new THREE.PerspectiveCamera( 45, canvasRatio, 1, 8000 );

	// CONTROLS
	cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
	camera.position.set( -500, 600, 800);
  
	cameraControls.target.set(0,0,0);
}

function addToDOM() {
    var canvas = document.getElementById('canvas');
    canvas.appendChild(renderer.domElement);
    canvas.appendChild(gui.domElement);
}

function animate() {
	window.requestAnimationFrame(animate);
	render();
}

function calculateLinearRegression() {
  var events = [];
  redBalls.forEach( function (b) {
    events.push([b.position.x, b.position.y, b.position.z])
  });
  
}

function updateScene(){
  calculateCentroid();
  createMatrix();
  //calculateLinearRegression()
}



function createMatrix() {
  mat = [];
  redBalls.forEach( function (b) {
    mat.push([b.position.x, b.position.y, b.position.z]);
  });
  m = new Matrix(mat);
}


function calculateCentroid() {
  var xCent = 0, yCent = 0, zCent = 0;
  redBalls.forEach( function (b) {
    xCent += b.position.x;
    yCent += b.position.y;
    zCent += b.position.z
  });
  xCent = xCent/redBalls.length;
  yCent = yCent/redBalls.length;
  zCent = zCent/redBalls.length;
  centroid.position.set(xCent, yCent, zCent);
}

function render() {
	var delta = clock.getDelta();
	cameraControls.update(delta);
	camera.updateMatrixWorld();  
	renderer.render(scene, camera);
}


function onDocumentMouseMove( event ) {
	event.preventDefault();
  // this converts window mouse values to x and y mouse coordinates that range
  // between -1 and 1 in the canvas
  mouse.set(
     (( event.clientX / window.innerWidth ) * 2 - 1) *
     (window.innerWidth/canvasWidth),
     (-((event.clientY - ($("#canvas").position().top + (canvasHeight/2))) / window.innerHeight) * 2 )
     * (window.innerHeight/canvasHeight));

  // uses Three.js built-in raycaster to send a ray from the camera
	raycaster.setFromCamera( mouse, camera );
	if ( SELECTED ) {
    if ( raycaster.ray.intersectPlane( iplane, intersection ) ) {
          var prevPos = SELECTED.position.clone();
          SELECTED.position.copy( intersection.sub( offset ) );
          updateScene();
    }
		return;
	}

  // determines which objects are intersected by the ray, and sets the dragging
  // iplane with respect to the camera view.
	intersects = raycaster.intersectObjects(objects, true);
	if ( intersects.length > 0 ) {
		if ( INTERSECTED != intersects[0].object ) {
			INTERSECTED = intersects[0].object;
			iplane.setFromNormalAndCoplanarPoint(
        camera.getWorldDirection( iplane.normal ),
        INTERSECTED.position);
		}
		canvas.style.cursor = 'pointer';
	} else {
		INTERSECTED = null;
		canvas.style.cursor = 'auto';
	}
}

// handles mouse down event
function onDocumentMouseDown( event ) {
	event.preventDefault();
	raycaster.setFromCamera( mouse, camera );
	var intersects = raycaster.intersectObjects( objects );
	if ( intersects.length > 0 ) {
		cameraControls.enabled = false;
		SELECTED = intersects[ 0 ].object.userData.parent || intersects[ 0 ].object;
		if ( raycaster.ray.intersectPlane( iplane, intersection ) ) {
			offset.copy( intersection ).sub( SELECTED.position );
      
		}
		canvas.style.cursor = 'move';
	}
}

// handles mouse up event
function onDocumentMouseUp( event ) {
	event.preventDefault();
	cameraControls.enabled = true;
	if ( INTERSECTED ) {
		SELECTED = null;
	}
	canvas.style.cursor = 'auto';
}

function toXYCoords (pos) {
	var vector = pos.clone().project(camera);
	vector.x = (vector.x + 1)/2 * canvasWidth;
	vector.y = -(vector.y - 1)/2 * canvasHeight;
  return vector;
}

try {
  init();
  fillScene();
} catch(error) {
    console.log("Your program encountered an unrecoverable error, can not draw on canvas. Error was:");
    console.log(error);
}
