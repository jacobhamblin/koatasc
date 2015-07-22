var scene, camera, renderer, $viewport, height, width, SEGMENTS, tetrahedron;
var cameraMoveY = 0;
var currentIndex = 0;
var previousIndex = 0;
var orbsTimesRun = 0;
var orbsTimesRunTwo = 0;
var soundsTimesRun = 0;
var orbImages = [];
var orbImagesTwo = [];
var transitionSounds = [];
var orbPreImages = new Object;
var orbPreImagesTwo = new Object;
var orbsUnloaded = ['bluGrn1-64.png', 'bluGrn2-64.png', 'bluGrn3-64.png', 'bluGrn4-64.png', 'bluGrn5-64.png', 'prpl1-64.png', 'prpl2-64.png', 'prpl3-64.png'];
var orbsUnloadedTwo = ['a1-64.png', 'a2-64.png', 'a3-64.png', 'a5-64.png', 'a6-64.png', 'a7-64.png', 'a8-64.png', 'a9-64.png', 'a10-64.png', 'a11-64.png'];
var unloadedImageCollections = [orbsUnloaded, orbsUnloadedTwo];
var loadedImageCollections = [orbImages, orbImagesTwo];
var imageHashCollections = [orbPreImages, orbPreImagesTwo];
var counters = [orbsTimesRun, orbsTimesRunTwo];
var transitionPreSounds = new Object;
var mouse = new THREE.Vector2(), INTERSECTED;
var raycaster = new THREE.Raycaster();
var currentSegThree = 0;
var numEdgyOrbs = 0;

SEGMENTS = [[0, 0, 40], [0, 50, 100], [0, 0, 180], [0, -100, 200], ['link']];

function makeNav() {
  var container = document.getElementsByClassName('nav-container')[0];
  for (var i = 0; i < SEGMENTS.length; i++) {
      var div = document.createElement('div');
    if (i === SEGMENTS.length - 1) {
      div.className = 'circle-nav';
  } else {
      div.className = 'triangle-nav';
    }
      container.appendChild(div);
  }
  $($('.triangle-nav')[currentIndex]).addClass('active');
}

window.request

setViewport($(document.body));

function setViewport($el) {
  $viewport = $el;

  width = $viewport.width();
  height = $viewport.height();

  function checkCount (orbs, sum, orbsTwo, sumTwo) {
    if (orbs.length === sum && orbsTwo.length === sumTwo) {
      $('.help-icon').click(function () {
        $('.help-container').toggleClass('is-active');
        $('.help-inner').toggleClass('is-active');
      });
      $('.help-container').click(function (event) {
        $('.help-container').toggleClass('is-active');
        $('.help-inner').toggleClass('is-active');
      })

      $('.load').html('');

      init();
      makeNav();
      animate();
    }
  }
  loadImages(unloadedImageCollections, loadedImageCollections, imageHashCollections, counters);

  loadAudio("./sounds/rumb.mp3", transitionSounds);
  loadAudio("./sounds/rumb1.mp3", transitionSounds);


  function loadImages (unloadedCols, loadedCols, hashCols, counters) {
    for (var i = 0; i < unloadedCols.length; i++) {
      var collection = unloadedCols[i];
      for (var j = 0; j < collection.length; j++) {
        var file = collection[j];
        loadImage('./images/' + file, loadedCols[i], hashCols[i], counters[i]);
      }
    }
  }

  function loadAudio (url, transitionSounds) {
    soundsTimesRun++;
    var fileName = url.match(/(\w+.mp3)/g)[0];
    transitionPreSounds[fileName] = new Audio(url);
    transitionSounds.push(transitionPreSounds[fileName]);
  }

  function loadImage (url, curCollection, orbObject, counter) {
    counter++;
    orbObject['img' + counter] = document.createElement('img');
    orbObject['img' + counter].src = url;
    orbObject['img' + counter].addEventListener('load', function (event) {
      curCollection.push(THREE.ImageUtils.loadTexture(url));
      curCollection[curCollection.length - 1].image = orbObject['img' + counter];
      checkCount(orbImages, orbsUnloaded.length, orbImagesTwo, orbsUnloadedTwo.length);
    });
  }
}

function init() {
  scene = new THREE.Scene();

  // renderer

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);
  $viewport.append(renderer.domElement);

  // camera

  camera = new THREE.PerspectiveCamera(50, width / height, 1, 90);
  camera.position.set(0, 0, 40);
  scene.add(camera);

  renderer.setClearColor(0x040404, 1);



  // light

  // var light = new THREE.AmbientLight ( 0x404040 );
  // scene.add(light);

  jQuery(window).on('resize', resize);
  $viewport.on('mousemove', mouseMove);
  $viewport.on('DOMMouseScroll mousewheel', scroll);
  jQuery(document).on('keydown', keyDown);

  $('.nav-container').click(function (e) {
    var navItems = $('.nav-container').children();
    for (var i = 0; i < navItems.length; i++) {
      if (currentIndex !== i) {
        if (i === navItems.length - 1 && e.target === navItems[i]) {
          transitionPreSounds['rumb.mp3'].play();
          animateCamera(i-1);
          currentIndex += 1;
          $('#contact-div').css('top', '95vh');
          switchNavActive(i);
        } else if (navItems[i] === e.target) {
          if (currentIndex === navItems.length - 1) {
            $('#contact-div').css('top', '100vh');
          }
          transitionPreSounds['rumb.mp3'].play();
          animateCamera(i);
          switchNavActive(i);
        }
      }
    }
  })

  function mouseMove (event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (event.clientY / window.innerHeight) * 2 + 1;
  }

  function scroll (event) {
    if (!isScrolling()) {
      event.originalEvent.wheelDelta >= 0 ? prev() : next();
    }
  }

  function isScrolling () {
    if (currentIndex === SEGMENTS.length - 1) {
      return false;
    }
    var coords = SEGMENTS[currentIndex];
    var cameraPositions = [camera.position.x, camera.position.y, camera.position.z];
    for (var i = 0; i < coords.length; i++) {
      var desired = coords[i];
      var real = cameraPositions[i];
      if (!(desired - 5 < real && real < desired + 5)) {
        return true;
      }
    }
    return false;
  }

  function prev () {
    if (currentIndex === 0) {
      return;
    } else if (currentIndex === SEGMENTS.length - 1) {
      $('#contact-div').css('top', '100vh');
      currentIndex = currentIndex - 1;
    } else {
      transitionPreSounds['rumb1.mp3'].play();
      animateCamera(currentIndex - 1);
    }
    switchNavActive(-1);
  }

  function next () {
    if (currentIndex === SEGMENTS.length - 2) {
      currentIndex = currentIndex + 1;
      $('#contact-div').css('top', '95vh');
      // $(function(){
        // $viewport.append("<div id='contact-div' style='top: 101vh;'></div>")
        // $('#contact-div').load("contact.html");
      // });
    } else if (currentIndex === SEGMENTS.length - 1) {
      return;
    } else {
      transitionPreSounds['rumb.mp3'].play();
      animateCamera(currentIndex + 1);
    }
    switchNavActive(1);
  }

  function switchNavActive(num) {
    var navs = $('.nav-container').children();
    for (var i = 0; i < navs.length; i++) {
      if ($(navs[i]).hasClass('active')) {
        $(navs[i]).removeClass('active');
        $(navs[currentIndex]).addClass('active');
        return;
      }
    }
  }

  function animateCamera (index) {
    TweenMax.to(camera.position, 2, {
      x: SEGMENTS[index][0],
      y: SEGMENTS[index][1],
      z: SEGMENTS[index][2]
    })
    currentIndex = index;
    var coords = SEGMENTS[currentIndex];
    var vector = new THREE.Vector3(coords[0],coords[1],coords[2]);
    camera.lookAt(vector);
  }

  function resize () {
    width = $viewport.width();
    height = $viewport.height();

    camera.aspect = width/height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
  }

  function keyDown (event) {
    if (!isScrolling()) {
      var keyCode = event.keyCode;

      if (keyCode === 40) {
        next();
      } else if (keyCode === 38) {
        prev();
      }
    }
  }


  function addSegmentOneSprites(numberOfSprites, collection) {

    go(numberOfSprites, collection, 'close');
    go(numberOfSprites, collection, 'far');
    go(numberOfSprites/4, collection, 'above');

    function go (numberOfSprites, collection, distance) {
      for (var i = 0, j = 0; i < numberOfSprites; i++, j+= 3) {
        if (distance === 'close') {
          var matTexture = THREE.bubblesProperties.close.texture[i];
        } else {
          var matTexture = THREE.bubblesProperties.far.texture[i];
        };
        var rotation = Math.random() * 6.283;
        matTexture === 1 || matTexture === 7 ? rotation = 0 : rotation = Math.random() * 6.283;
        var mat = new THREE.SpriteMaterial({
          map: collection[matTexture],
          color: 0xffffff,
          fog: true,
          rotation: rotation,
        })
        var bubble = new THREE.Sprite(mat);
        if (distance === 'close') {
          // these values were assigned randomly at one point. I refreshed the page many times and saved the values when I liked the scene the best.
          // var x = (Math.random() * 15) - 7.5;
          // var y = (Math.random() * 15) + 17.5;
          // var z = (Math.random() * 15) + 42.5;
          var x = THREE.bubblesProperties.close.xyz[j];
          var y = THREE.bubblesProperties.close.xyz[j + 1];
          var z = THREE.bubblesProperties.close.xyz[j + 2];
          var width = mat.map.image.width;
          // var newSize = (Math.random() * ((width * .01) * Math.random()));
          var newSize = THREE.bubblesProperties.close.size[i];
          // bubble.smallSize = newSize;
        } else if (distance === 'far') {
          // var x = (Math.random() * 30) - 15;
          // var y = (Math.random() * 30) + 10;
          // var z = (Math.random() * 80) + 10;
          var x = THREE.bubblesProperties.far.xyz[j];
          var y = THREE.bubblesProperties.far.xyz[j + 1];
          var z = THREE.bubblesProperties.far.xyz[j + 2];
          var width = mat.map.image.width;
          // var newSize = (Math.random() * ((width * .016) * (Math.random() * 4) - 1.5)) * (Math.random() * ((width * .016) * (Math.random() * 4) - 1.5));
          var newSize = THREE.bubblesProperties.far.size[i];
          bubble.newSize = newSize;
        } else if (distance === 'above') {
          var x = (Math.random() * 12) - 6;
          var y = (Math.random() * 12) + 26;
          var z = Math.random() * 15 + 42.5;
          var width = mat.map.image.width;
          var newSize = (Math.random() * ((width * .01) * Math.random()));
        }
        bubble.matTexture = matTexture;
        bubble.position.set(x, y, z);
        bubble.scale.set(newSize, newSize, 1);
        scene.add(bubble);
        THREE.bubbles.push(bubble);
      }

    }

  }

  function addSegmentOneParticles(numberOfParticles) {

    var geometry = new THREE.Geometry();
    for (var i = 0; i < numberOfParticles; i++) {
      var vertex = new THREE.Vector3();
      vertex.x = (Math.random() * 12) - 6;
      vertex.y = (Math.random() * 12) + 26;
      vertex.z = Math.random() * 15 + 42.5;
      geometry.vertices.push(vertex);
    }

      var size = Math.random();
      var mat = new THREE.PointCloudMaterial( { size: size });

      var particle = new THREE.PointCloud(geometry, mat);
      scene.add(particle);
  }

  function addSegmentOneSpheres () {
    var geometry = new THREE.SphereGeometry(3, 32, 32);
    var material = new THREE.MeshLambertMaterial({ color: 0x888888 });
    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    mesh.position.set(0, 25, 50);
    THREE.bigSphereSegmentOne = mesh;

    var geometry = new THREE.SphereGeometry(1, 32, 32);
    var material = new THREE.MeshLambertMaterial({ color: 0x888888 });
    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    mesh.position.set(-8, 27, 65);
  }

  // segment 0
  addSegmentZero();

  function addSegmentZero () {
    THREE.lightZero = new THREE.PointLight(0xffffff, 3, 40);
    THREE.lightZero.position.set(0, 0, 0);
    scene.add(THREE.lightZero);

    var trianglesCount = 40;
    THREE.triangles = [];
    for (var i = 0; i < trianglesCount; i++) {
      var radius = ((Math.random() + .5) * (Math.random() + .5) * (Math.random() + .5) * (Math.random() + .5));
      var geometry = new THREE.TetrahedronGeometry(radius, 0);
      var color = (Math.random() * .99) * 0xffffff;
      var material = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        shading: THREE.FlatShading,
        });
      var pyramid = new THREE.Mesh(geometry, material);
      pyramid.radius = radius;
      scene.add(pyramid);
      var x = (Math.random() * 40) - 20;
      var y = (Math.random() * 40) - 20;
      var z = (Math.random() * 80) - 70;
      pyramid.position.set(x, y, z);
      pyramid.rotX = Math.random() > .5 ? .05 - (pyramid.radius * .02) : -(.05 - pyramid.radius * .02);
      pyramid.rotY = Math.random() > .5 ? .05 - (pyramid.radius  * .02) : -(.05 - pyramid.radius * .02);
      pyramid.timing = Math.floor(Math.random() * 10);
      THREE.triangles.push(pyramid);
    }

    addSegmentZeroText();

    function addSegmentZeroText() {
      var text = 'w e l c o m e';
      var text3d = new THREE.TextGeometry( text, {
        size: 4,
        height: 1,
        curveSegments: 2,
        font: "helvetiker"
      })
      text3d.computeBoundingBox();
      var centerOffset = -0.5 * ( text3d.boundingBox.max.x - text3d.boundingBox.min.x );
      var textMaterial = new THREE.MeshLambertMaterial({
        color: 0x333333,
        overdraw: 0.5
      });
      text = new THREE.Mesh(text3d, textMaterial);
      text.position.x = centerOffset;
      text.position.y = 0;
      text.position.z = -20;
      scene.add(text);
    }
    // scene.fog = THREE.Fog( 0x888888, 0.01 );
    // fog.position.set(0, 0, 0);
  }


  // segment 1
  addSegmentOne(orbImages);

  function addSegmentOne (orbImages) {
    THREE.lightOne = new THREE.PointLight(0xffffff, 1, 30);
    THREE.lightOne.position.set(0, 40, 50);
    scene.add(THREE.lightOne);

    THREE.lightTwo = new THREE.PointLight(0xffffff, 2, 10);
    THREE.lightTwo.position.set(-8, 32, 62);
    scene.add(THREE.lightTwo);

    addSegmentOneSpheres();
    addSegmentOneSprites(150, orbImages);
    // addSegmentOneParticles(10);

    THREE.spotlight = new THREE.SpotLight( 0xffffff );
    THREE.spotlight.castShadow = true;    // only necessary if you want to cast shadows
    THREE.spotlight.target = THREE.bigSphereSegmentOne;    // keep the THREE.spotlight on target
    THREE.spotlight.exponent = 90;    // useful for narrowing the beam
    THREE.spotlight.shadowCameraNear = 1;
    THREE.spotlight.shadowCameraFar = 60;
    THREE.spotlight.shadowCameraFov = 30;
    //THREE.spotlight.shadowCameraVisible = true;    // show me the camera
    THREE.spotlight.shadowDarkness = 0.9;
    THREE.spotlight.position.set(0, 50, 50);
  }

  // segment 2
  addSegmentTwo();

  function addSegmentTwo () {
    THREE.lightThree = new THREE.PointLight( 0xff0000, 1, 75 );
    scene.add(THREE.lightThree);
    THREE.lightFour = new THREE.PointLight( 0x0000ff, 1, 75 );
    scene.add(THREE.lightFour);
    THREE.lightFive = new THREE.PointLight( 0xffffff, 1, 75 );
    scene.add(THREE.lightFive);

    THREE.edgyOrbs = [];
    numEdgyOrbs = 256;
    for (var i = 0; i < numEdgyOrbs; i++) {

      var radius = 0.5;
      var geometry = new THREE.TetrahedronGeometry(radius, 0);
      var color = 0xffffff;
      var material = new THREE.MeshLambertMaterial({
        color: color,
        shading: THREE.FlatShading,
      });
      var edgyOrb = new THREE.Mesh(geometry, material);
      scene.add(edgyOrb);
      var x = (Math.random() * 50) - 25;
      var y = (Math.random() * 50) - 25;
      var z = (Math.random() * 100) + 80;
      edgyOrb.position.set(x, y, z);
      THREE.edgyOrbPositions.push(x, y, z);
      THREE.edgyOrbs.push(edgyOrb);
    }

    transition();

    // Cube

    // var amount = 8;
    // var separation = 3;
    // var offset = ( ( amount - 1 ) * separation ) / 2;
    //
    // for ( var i = 0; i < numEdgyOrbs; i ++ ) {
    //
    //   var x = ( i % amount ) * separation;
    //   var y = Math.floor( ( i / amount ) % amount ) * separation;
    //   var z = Math.floor( i / ( amount * amount ) ) * separation;
    //
    //   THREE.edgyOrbPositions.push( x - offset, y - offset, z - offset + 160);
    //
    // }

    // Sphere

    var radius = 15;

    for ( var i = 0; i < numEdgyOrbs; i ++ ) {

      var phi = Math.acos( -1 + ( 2 * i ) / numEdgyOrbs );
      var theta = Math.sqrt( numEdgyOrbs * Math.PI ) * phi;

      THREE.edgyOrbPositions.push(
        radius * Math.cos( theta ) * Math.sin( phi ),
        radius * Math.sin( theta ) * Math.sin( phi ),
        (radius * Math.cos( phi )) + 130
      );

    }
  }

  addSegmentThreeSprites(256, orbImagesTwo);
  addSegmentThreeText();

  function addSegmentThreeSprites(numberOfSprites, collection) {

    go(numberOfSprites, collection);

    function go(numberOfSprites, collection) {
      for (var i = 0; i < numberOfSprites; i++) {
        var matTexture = Math.floor(Math.random() * collection.length);
        var rotation = Math.random() * 6.283;
        var mat = new THREE.SpriteMaterial({
          map: collection[matTexture],
          color: 0xffffff,
          fog: true,
          rotation: rotation,
        });
        var bubble = new THREE.Sprite(mat);
        var x = (Math.random() * 40) - 20;
        var y = (Math.random() * 40) - 95;
        var z = (Math.random() * 50) + 125;
        var width = mat.map.image.width;
        var newSize = (Math.random() * ((width * .016) * (Math.random() * 4) - 1.5)) * (Math.random() * ((width * .016) * (Math.random() * 4) - 1.5));
        bubble.matTexture = matTexture;
        bubble.position.set(x, y, z);
        bubble.scale.set(newSize, newSize, 1);
        scene.add(bubble);
        THREE.bubblesTwo.push(bubble);
      }
    }

    THREE.lightSix = new THREE.PointLight( 0xff0000, 1, 75 );
    scene.add(THREE.lightSix);
    THREE.lightSeven = new THREE.PointLight( 0xff0000, 1, 75 );
    scene.add(THREE.lightSeven);
    THREE.lightEight = new THREE.PointLight( 0xffffff, 1, 75 );
    scene.add(THREE.lightEight);
  }

  function addSegmentThreeText() {
    addText(1);
    addText(2);

    function addText(distance) {
      if (distance === 1) {
        var text = 't h a n k  y o u';
        var size = 3;
        var y = -77;
        var z = 150;
      } else if (distance === 2) {
        var text = 'c o m e  a g a i n';
        var y = -73;
        var z = 135;
        var size = 1;
      }
      var text3d = new THREE.TextGeometry( text, {
        size: size,
        height: 1,
        curveSegments: 2,
        font: "helvetiker"
      })
      text3d.computeBoundingBox();
      var centerOffset = -0.5 * ( text3d.boundingBox.max.x - text3d.boundingBox.min.x );
      var textMaterial = new THREE.MeshLambertMaterial({
        color: 0x333333,
        overdraw: 0.5
      });
      text = new THREE.Mesh(text3d, textMaterial);
      text.position.x = centerOffset;
      text.position.y = y;
      text.position.z = z;
      scene.add(text);
    }
  }



  function transition() {
    var offset = currentSegThree * numEdgyOrbs * 3;
    var duration = 3000;
    if (currentSegThree === 0) {
      duration = 25000;
    }

    for ( var i = 0, j = offset; i < numEdgyOrbs; i++, j += 3 ) {

      var object = THREE.edgyOrbs[ i ];

      new TWEEN.Tween( object.position )
        .to( {
          x: THREE.edgyOrbPositions[ j ],
          y: THREE.edgyOrbPositions[ j + 1 ],
          z: THREE.edgyOrbPositions[ j + 2 ]
        }, duration )
        .easing( TWEEN.Easing.Exponential.InOut )
        .start();

    }

    new TWEEN.Tween( this )
      .to( {}, duration )
      .onComplete( transition )
      .start();

    currentSegThree = ( currentSegThree + 1 ) % 2;
  }

  // controls

  THREE.controls = new THREE.OrbitControls(camera, renderer.domElement);
  THREE.controls.center.set (0,0,0);
  THREE.controls.userRotate = false;
  THREE.controls.userZoom = false;
}

function animate() {
  requestAnimationFrame(animate);
  // mouseOverInteract();

  // segment 0 spin tetrahedrons, -glitch-out-

  for (var i = 0; i < THREE.triangles.length; i++) {
    // if (Math.round(new Date().getTime() * .001) % THREE.triangles[i].timing == 0) {
    //   var rotX = Math.random() > .5 ? .05 - (THREE.triangles[i].radius * .02) : -(.05 - THREE.triangles[i].radius * .02);
    //   var rotY = Math.random() > .5 ? .05 - (THREE.triangles[i].radius * .02) : -(.05 - THREE.triangles[i].radius * .02);
    //
    //   THREE.triangles[i].rotation.x += rotX;
    //   THREE.triangles[i].rotation.y -= rotY;
    // } else {
      THREE.triangles[i].rotation.x += THREE.triangles[i].rotX / 2;
      THREE.triangles[i].rotation.y -= THREE.triangles[i].rotY / 2;
      THREE.triangles[i].position.x += ((Math.cos(cameraMoveY) * .01) * Math.random());

    // }

  }

  // segment 0 COS move lightZero

  var oscillate = ((Math.cos(cameraMoveY) - 1) * 10);

  THREE.lightZero.position.set(oscillate + 10, 0, oscillate + 10);

  // segment 1 orbs grow, shrink, move left, right

  for ( var i = 0, l = THREE.bubbles.length; i < l; i ++ ) {

    var object = THREE.bubbles[ i ];
    if (object.newSize !== undefined) {
      var scale = (Math.cos(cameraMoveY) / 5) + object.newSize;
      object.scale.set( scale, scale, scale );
    }
    if (i % 2 === 0) {
      object.position.x += (Math.cos(cameraMoveY) * .005) * (((i % 10) + 1) * .05);
    } else {
      object.position.x -= (Math.cos(cameraMoveY) * .005) * (((i % 10) + 1) * .05);
    }

  }

  // help scroll brightness

  if ($('.help-inner').css('display') === 'block') {
    $('.down.arrow').css('-webkit-filter', 'invert(' + (Math.cos(cameraMoveY) + 1) + ')');
  }
  $('.attention').css('-webkit-filter', 'opacity(' + (Math.cos(cameraMoveY) + 1) + ')');

  // segment 1 orb lighting animation

  THREE.lightOne.intensity += Math.cos(cameraMoveY) / 50;

  // segment 1 orb movement


  // segment 2 light movement

  var time = Date.now() * 0.0005;

  THREE.lightThree.position.x = Math.sin( time * 0.7 ) * 30;
	THREE.lightThree.position.y = Math.cos( time * 0.5 ) * 40;
	THREE.lightThree.position.z = (Math.cos( time * 0.3 ) * 30) + 170;

	THREE.lightFour.position.x = Math.cos( time * 0.3 ) * 30;
	THREE.lightFour.position.y = Math.sin( time * 0.5 ) * 40;
	THREE.lightFour.position.z = (Math.sin( time * 0.7 ) * 30) + 170;

	THREE.lightFive.position.x = Math.sin( time * 0.7 ) * 30;
	THREE.lightFive.position.y = Math.cos( time * 0.3 ) * 40;
	THREE.lightFive.position.z = (Math.sin( time * 0.5 ) * 30) + 170;


  // segment 3 light movement

  THREE.lightSix.position.x = Math.sin( time * 0.7 ) * 30;
  THREE.lightSix.position.y = (Math.cos( time * 0.5 ) * 40) - 100;
  THREE.lightSix.position.z = (Math.cos( time * 0.3 ) * 30) + 190;

  THREE.lightSeven.position.x = Math.cos( time * 0.3 ) * 30;
  THREE.lightSeven.position.y = (Math.sin( time * 0.5 ) * 40) - 100;
  THREE.lightSeven.position.z = (Math.sin( time * 0.7 ) * 30) + 190;

  THREE.lightEight.position.x = Math.sin( time * 0.7 ) * 30;
  THREE.lightEight.position.y = (Math.cos( time * 0.3 ) * 40) - 100;
  THREE.lightEight.position.z = (Math.sin( time * 0.5 ) * 30) + 190;

  // segment 2 tweens

  TWEEN.update();

  // segment 2 tetrahedron spin

  for (var i = 0; i < THREE.edgyOrbs.length; i++) {
    tetrahedron = THREE.edgyOrbs[i];
    tetrahedron.rotation.x += .025;
    tetrahedron.rotation.y += .025;
  }

  function mouseOverInteract() {
      // update the picking ray with the camera and mouse position
  	raycaster.setFromCamera( mouse, camera );

  	// calculate objects intersecting the picking ray
  	var intersects = raycaster.intersectObjects( scene.children );

    if ( intersects.length > 0 ) {

			if ( INTERSECTED != intersects[ 0 ].object ) {

				if ( INTERSECTED ) {
          INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
        }
				INTERSECTED = intersects[ 0 ].object;
				INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
				INTERSECTED.material.emissive.setHex( 0xff0000 );

			}

		} else {

			if ( INTERSECTED ) {
        // INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
      }
			INTERSECTED = null;

		}
  }

  camera.position.y += Math.cos(cameraMoveY) / 50;
  cameraMoveY += 0.02;
  THREE.controls.update();

  camera.position.x += ((mouse.x * 5) - camera.position.x) * 0.03;
  renderer.render(scene, camera);

}
