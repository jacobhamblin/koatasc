TweenMax.to("#logo", 2, {left:window.innerWidth/2-100});

var scene, camera, renderer, $viewport, height, width, segments;
var mX = 0;
var cameraMoveY = 0;
var currentIndex = 0;
var previousIndex = 0;

segments = [[0, 0, 40], [0, 50, 40]];

window.request

setViewport($(document.body));
animate();

function setViewport($el) {
  $viewport = $el;

  width = $viewport.width();
  height = $viewport.height();

  init();
}

function init() {
  scene = new THREE.Scene();

  // renderer

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(width, height);
  $viewport.append(renderer.domElement);

  // camera

  camera = new THREE.PerspectiveCamera(50, width / height, 20, 45);
  camera.position.set(0, 0, 40);
  scene.add(camera);

  renderer.setClearColor(0x111111, 1);

  // var light = new THREE.AmbientLight(0xffffff, 1, 100);
  // light.position.set(0,10,0);
  // scene.add(light);

  // light

  var light = new THREE.AmbientLight ( 0x404040 );
  scene.add(light);

  jQuery(window).on('resize', resize);
  $viewport.on('mousemove', mouseMove);
  $viewport.on('DOMMouseScroll mousewheel', scroll);
  jQuery(document).on('keydown', keyDown);

  function mouseMove (event) {
    mX = (event.clientX / window.innerWidth) * 3 - 1;
  }

  function scroll (event) {
    event.originalEvent.wheelDelta >= 0 ? prev() : next();
  }

  function prev () {
    if (currentIndex === 0) {
      return;
    }
    animateCamera(currentIndex - 1);
  }

  function next () {
    if (currentIndex === segments.length - 1) {
      return;
    }
    animateCamera(currentIndex + 1);
  }

  function animateCamera (index) {
    if ( index > currentIndex ) {
      TweenMax.to(camera.position, 2, {
        x: segments[index][0],
        y: segments[index][1],
        z: segments[index][2]
      })
      currentIndex = index;
    } else {
      TweenMax.to(camera.position, 2, {
        x: segments[currentIndex - 1][0],
        y: segments[currentIndex - 1][1],
        z: segments[currentIndex - 1][2]
      })
      currentIndex = index;
    }
  }

  function resize () {
    width = $viewport.width();
    height = $viewport.height();

    camera.aspect = width/height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
  }

  function keyDown (event) {
    // if (!isScrolling && isActive) {
      var keyCode = event.keyCode;

      if (keyCode === 40) {
        next();
      } else if (keyCode === 38) {
        prev();
      }
    // }
  }


  // segment 0
  addSegmentZero();

  function addSegmentZero () {
    var trianglesCount = 40;
    THREE.triangles = [];
    for (var i = 0; i < trianglesCount; i++) {
      var radius = Math.random() * 2;
      var geometry = new THREE.TetrahedronGeometry(radius, 0);
      var material = new THREE.MeshDepthMaterial( { } );
      var pyramid = new THREE.Mesh(geometry, material);
      scene.add(pyramid);
      var x = Math.random() * 24;
      var y = Math.random() * 24;
      var z = Math.random() * 24;
      pyramid.position.set(x - 12, y - 12, z - 12);
      pyramid.rotX = (Math.random() * 0.1) - 0.05;
      pyramid.rotY = (Math.random() * 0.1) - 0.05;
      pyramid.timing = Math.floor(Math.random() * 10);
      THREE.triangles.push(pyramid);
    }
  }


  // segment 1
  // addSegmentOneLines();
  //
  // function addSegmentOne () {
  //
  // }





  // THREE.pyramid = new THREE.Mesh(geometry, material);
  // THREE.pyramidTwo = new THREE.Mesh(geometry, material);
  // scene.add(THREE.pyramid);
  // scene.add(THREE.pyramidTwo);
  // THREE.pyramidTwo.position.set(2, 2, 2);
  // THREE.pyramid.position.set(-2, -2, -2);

  // var colladaLoader = new THREE.ColladaLoader();
  // var dae = colladaLoader.load(
  //   'https://s3-us-west-1.amazonaws.com/koatasc/models/orbs.dae',
  //   function (collada) {
  //     scene.add(collada.scene );
  //   });

  // controls

  THREE.controls = new THREE.OrbitControls(camera, renderer.domElement);
  THREE.controls.center.set (0,0,0);
  THREE.controls.userRotate = false;
  THREE.controls.userZoom = false;
}

function animate() {
  requestAnimationFrame(animate);

  for (var i = 0; i < THREE.triangles.length; i++) {
    if (Math.round(new Date().getTime() * .001) % THREE.triangles[i].timing == 0) {
      var rotX = (Math.random() * 0.1) - 0.05;
      var rotY = (Math.random() * 0.1) - 0.05;

      THREE.triangles[i].rotation.x += rotX;
      THREE.triangles[i].rotation.y -= rotY;
    } else {
      THREE.triangles[i].rotation.x += THREE.triangles[i].rotX;
      THREE.triangles[i].rotation.y -= THREE.triangles[i].rotY;
    }

  }
  camera.position.y += Math.cos(cameraMoveY) / 50;
  cameraMoveY += 0.02;

  camera.position.x += ((mX * 5) - camera.position.x) * 0.03;
  renderer.render(scene, camera);
  THREE.controls.update();
}
