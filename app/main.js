TweenMax.to("#logo", 2, {left:window.innerWidth/2-100});

var scene, camera, renderer, $viewport, height, width, SEGMENTS;
var mX = 0;
var cameraMoveY = 0;
var currentIndex = 0;
var previousIndex = 0;
var orbImages = [];
THREE.bubbles = [];

SEGMENTS = [[0, 0, 40], [0, 50, 40]];


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

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);
  $viewport.append(renderer.domElement);

  // camera

  camera = new THREE.PerspectiveCamera(50, width / height, 20, 45);
  camera.position.set(0, 0, 40);
  scene.add(camera);

  renderer.setClearColor(0x000000, 1);



  // light

  // var light = new THREE.AmbientLight ( 0x404040 );
  // scene.add(light);

  jQuery(window).on('resize', resize);
  $viewport.on('mousemove', mouseMove);
  // $viewport.on('DOMMouseScroll mousewheel', scroll);
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
    if (currentIndex === SEGMENTS.length - 1) {
      return;
    }
    animateCamera(currentIndex + 1);
  }

  function animateCamera (index) {
    if ( index > currentIndex ) {
      TweenMax.to(camera.position, 2, {
        x: SEGMENTS[index][0],
        y: SEGMENTS[index][1],
        z: SEGMENTS[index][2]
      })
      currentIndex = index;
      var coords = SEGMENTS[currentIndex];
      var vector = new THREE.Vector3(coords[0],coords[1],coords[2]);
      camera.lookAt(vector);
    } else {
      TweenMax.to(camera.position, 2, {
        x: SEGMENTS[currentIndex - 1][0],
        y: SEGMENTS[currentIndex - 1][1],
        z: SEGMENTS[currentIndex - 1][2]
      })
      currentIndex = index;
      var coords = SEGMENTS[currentIndex];
      var vector = new THREE.Vector3(coords[0],coords[1],coords[2]);
      camera.lookAt(vector);
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

  function checkCount (imagesLoaded, collection) {
    if (imagesLoaded === 6) {
      debugger
      addSprites(75, collection);
    }
  }

  function addSprites(imagesLoaded, collection) {
    for (var i = 0; i < imagesLoaded; i++) {
      var radius = Math.random() * 2;
      var mat = new THREE.SpriteMaterial({
        map: collection[Math.floor(Math.random() * 6)],
        color: 0xffffff,
        fog: true
      })
      var width = mat.map.image.width;
      var height = mat.map.image.height;
      var bubble = new THREE.Sprite(mat);
      var x = (Math.random() * 24) - 12;
      var y = (Math.random() * 24) + 13;
      var z = (Math.random() * 24) - 12;
      bubble.position.set(x, y, z);
      bubble.scale.set(width, height, 1);
      scene.add(bubble);
      THREE.bubbles.push(bubble);
    }
  }

  // segment 0
  addSegmentZero();

  function addSegmentZero () {
    var trianglesCount = 20;
    THREE.triangles = [];
    for (var i = 0; i < trianglesCount; i++) {
      var radius = Math.random() + 1;
      var geometry = new THREE.TetrahedronGeometry(radius, 0);
      var material = new THREE.MeshDepthMaterial( { } );
      var pyramid = new THREE.Mesh(geometry, material);
      scene.add(pyramid);
      var x = (Math.random() * 24) - 12;
      var y = (Math.random() * 24) - 12;
      var z = (Math.random() * 24) - 12;
      pyramid.position.set(x, y, z);
      pyramid.rotX = (Math.random() * 0.1) - 0.05;
      pyramid.rotY = (Math.random() * 0.1) - 0.05;
      pyramid.timing = Math.floor(Math.random() * 10);
      THREE.triangles.push(pyramid);
    }
    // scene.fog = THREE.Fog( 0x888888, 0.01 );
    // fog.position.set(0, 0, 0);
  }

  // segment 1
  addSegmentOne();

  function addSegmentOne () {
    var imagesLoaded = 0;
    // var light = new THREE.PointLight(0xffffff, 1, 100);
    // light.position.set(0,50,0);
    // scene.add(light);

    THREE.ImageUtils.crossOrigin = '';
    var map1 = THREE.ImageUtils.loadTexture("./images/bluGrn1-64.png");
    var image = document.createElement( 'img' );
    image.src = "./images/bluGrn1-64.png";
		image.addEventListener( 'load', function ( event ) {
      map1.image = image;
      imagesLoaded ++;
      orbImages.push(map1);
      checkCount (imagesLoaded, orbImages);
    });

    var map2 = THREE.ImageUtils.loadTexture("./images/bluGrn2-64.png");
    var image = document.createElement( 'img' );
    image.src = "./images/bluGrn2-64.png";
		image.addEventListener( 'load', function ( event ) {
      map2.image = image;
      imagesLoaded ++;
      orbImages.push(map2);
      checkCount (imagesLoaded, orbImages);
    });

    var map3 = THREE.ImageUtils.loadTexture("./images/bluGrn3-64.png");
    var image = document.createElement( 'img' );
    image.src = "./images/bluGrn3-64.png";
    image.addEventListener( 'load', function ( event ) {
      map3.image = image;
      imagesLoaded ++;
      orbImages.push(map3);
      checkCount (imagesLoaded, orbImages);
    });

    var map4 = THREE.ImageUtils.loadTexture("./images/bluGrn4-64.png");
    var image = document.createElement( 'img' );
    image.src = "./images/bluGrn4-64.png";
    image.addEventListener( 'load', function ( event ) {
      map4.image = image;
      imagesLoaded ++;
      orbImages.push(map4);
      checkCount (imagesLoaded, orbImages);
    });

    var map5 = THREE.ImageUtils.loadTexture("./images/prpl1-64.png");
    var image = document.createElement( 'img' );
    image.src = "./images/prpl1-64.png";
    image.addEventListener( 'load', function ( event ) {
      map5.image = image;
      imagesLoaded ++;
      orbImages.push(map5);
      checkCount (imagesLoaded, orbImages);
    });

    var map6 = THREE.ImageUtils.loadTexture("./images/prpl2-64.png");
    var image = document.createElement( 'img' );
    image.src = "./images/prpl2-64.png";
    image.addEventListener( 'load', function ( event ) {
      map6.image = image;
      imagesLoaded ++;
      orbImages.push(map6);
      checkCount (imagesLoaded, orbImages);
    });

    var geometry = new THREE.SphereGeometry(5, 32, 32);
    var material = new THREE.MeshLambertMaterial({ color: 0x888888 });
    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    mesh.position.set(0, 25, 0);


  }

  // controls

  THREE.controls = new THREE.OrbitControls(camera, renderer.domElement);
  THREE.controls.center.set (0,0,0);
  // THREE.controls.userRotate = false;
  // THREE.controls.userZoom = false;
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

  var time = performance.now();

  for ( var i = 0, l = THREE.bubbles.length; i < l; i ++ ) {

    var object = THREE.bubbles[ i ];
    var scale = Math.sin( ( Math.floor( object.position.x ) + time ) * 0.002 ) * 0.3 + 1;
    object.scale.set( scale, scale, scale );

  }

  camera.position.y += Math.cos(cameraMoveY) / 50;
  cameraMoveY += 0.02;

  camera.position.x += ((mX * 5) - camera.position.x) * 0.03;
  renderer.render(scene, camera);
  THREE.controls.update();
}
