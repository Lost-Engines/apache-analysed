# Taking Apache Longbow apart

Apache Longbow is a helicopter simulator made by Digital Integration, first released in 1995 and called simply *Apache* in the US. It puts us low over the terrain, juggling weapons, navigation and a helicopter that demands rather more attention than a throttle and a heading. There are two seats to work from, four theatres to fly in, and a ground war carrying on underneath us.

We've reconstructed the game in C++, following the original executable and testing our work against its instructions. Along the way we built viewers for the models, maps and artwork. Those tools made it much easier to understand the game, and turned up some lovely pieces of its development history. This site collects a few favourites.

<figure><img src="../images/pilot-flight.png" width="640" height="480" class="pixel-art" alt="Apache's original pilot cockpit, with flight instruments and the world beyond the windscreen"><figcaption>The pilot's seat at Fort Hood, rendered by the original software engine during our comparisons.</figcaption></figure>

## Start with the discs

Our first job was sorting out what we actually had. Apache's releases span DOS, Windows, software rendering and 3dfx hardware, followed by budget reissues with much later dates on the discs. An October 2000 CD doesn't necessarily contain an October 2000 game.

Eight disc images, four patches and a playable demo gave us thirteen different Apache executables to compare. The reference we chose is the Windows software build dated 14 January 1998. Its game files appear unchanged on both the September 1998 Sold Out disc and the October 2000 European release. We could consolidate those duplicates and keep the earlier versions for comparison.

There was no CD audio to untangle. Music and speech are files, played through the game's own streaming system. Spoken briefings interrupt the music, then let it resume from the same byte position. Even this small detail gives us something concrete to check when rebuilding the sound system.

## A Windows executable with an ELF surprise

The most useful find was right at the end of the program file. The later Windows executables still contain their debug symbols, tucked into an appended ELF image with DWARF information inside it. The normal Windows debug directory is empty. Looking there alone would have missed the lot.

A marker in the final sixteen bytes points back to that extra data. Once decoded, it gave us 530 compilation units and 6,088 symbols in the software build. Suddenly we had names for the terrain renderer, flight models, weapons, avionics, menus and world simulation. We could also see the boundary between the game's own code and Digital Integration's shared library:

```text
E:\apache\source\models\model.c
E:\library\
```

Those names made a considerable difference. Instead of trying to identify an anonymous calculation somewhere in a large executable, we could start in the relevant subsystem and follow its calls. Watcom runtime names helped explain the calling conventions and generated code, too.

We then used Unicorn, an emulator for running machine instructions, to call selected original routines in isolation. Supply a model, a flight state or a set of control inputs; run the original; run our C++ version; compare the results. That became our main working method. A disagreement could be followed all the way down to the instruction that produced it.

## A model is a little drawing program

The model archive contains 1,314 records. Browsing them one by one initially produces a lot of repetition: several A-10s, several C-130s, buildings with the same name and increasingly simple shapes. These are linked levels of detail, which let the game spend fewer polygons on distant objects. Following the stored links gives us 699 model families.

The [model viewer](../models/) keeps those families together. Try the [A-10](../models/#3), then change its level of detail. Its chain runs through records 3, 5, 6 and 1213. The [C-130](../models/#34) has four versions as well. The category labels come from the game's object classes and placements, so we can move from a vehicle to the missions which use it.

<figure><a href="../models/#3"><img src="../images/a10.png" width="1200" height="750" alt="The A-10 model, with its wings and attached components assembled"></a><figcaption>The A-10 is assembled from a model and its attached parts. Its simpler versions are stored as linked records.</figcaption></figure>

There's more here than a list of vertices and triangles. Each model contains instructions for drawing faces, choosing their order, testing state bits and invoking attached models. An aircraft's wings can be separate components. Other branches select moving parts or different states. Decoding the points without following that program gives an incomplete object.

This also explains why a modern model viewer needs more than a mesh loader. We follow those branches, construct the attachments and apply the game's material rules before drawing the result. The viewer's “Attached parts” switch makes the construction particularly easy to see.

## Four landscapes, a lot of moving pieces

Fort Hood, Cyprus, Korea and Yemen each begin with a 257 by 257 grid of height samples. The engine splits every square into two triangles, choosing which diagonal to use. Texture and colour work turn that relatively modest grid into hills, fields and desert.

Roads, coastlines and runways are separate feature polygons. Buildings and other scenery sit on top of that, with 42,317 placements across the four maps. Missions add moving units, formations and orders. Our [mission atlas](../terrain/) brings these layers together: choose a briefing, follow a route on the map, then inspect the units and scenery in 3D.

<figure><a href="../terrain/#zone=CYPRUS&mission=41"><img src="../images/terrain.png" width="1200" height="800" alt="A neighbourhood of Cyprus, with textured terrain, roads and placed scenery"></a><figcaption>Terrain, feature polygons and scenery models meet in the atlas. Clicking the map moves the 3D view.</figcaption></figure>

There are 110 missions and 42,054 stored waypoints in this collection. Routes carry much more information than a destination. Tasks assign sides and formations, schedule units to enter later, and mark things to protect or destroy. A briefing is the visible part of a much larger set of instructions for the battle.

One rendering mismatch was especially satisfying to solve. We were drawing extra land around the edge of a map, using the large outer terrain features stored on the disc. The original loaded those features, visited the sectors and projected their vertices, just as we did. Then its drawing routine returned. It never reached the code that would draw their faces. Our extra coastline looked plausible, but the original software engine didn't put it on the screen.

## The cockpit that belongs to another game

A file called `3DPAL.LBM` might not sound like the place to find a joke. Open the version on the later discs, though, and there's a cockpit screenshot with a stick figure holding a sign that says “Abu Dabi”. Look more closely at the instruments: that's an F-16 cockpit, from Digital Integration's *iF-16*, sitting among Apache's working artwork.

<figure><a href="../artwork/"><img src="../images/palette-1997.png" width="320" height="240" class="pixel-art small-source" alt="The palette source image: an F-16 cockpit and the Abu Dabi stick figure"><span class="image-link">Compare the two versions →</span></a><figcaption>The later 3DPAL image. Its stored date is 22 May 1997.</figcaption></figure>

The job of this file was to supply colours. The first 224 palette entries match the 672 bytes of `3DPAL.RGB` used by the game. The pixels could be a cockpit, a map or a doodle; the export tool wanted the palette. A surviving batch command makes the workflow wonderfully plain:

```text
rgb 3dpal /f0 /l223
```

Other apparently stray screenshots have similar jobs. The fog image supplies a run of twenty palette colours. Explosion sheets are cut into frames, and a font sheet becomes 256 glyphs. Together they give us a glimpse of the artists' working files and the small tools that prepared them for the engine.

Comparing discs helped date the F-16's arrival. The 1996 releases carry an earlier `3DPAL` image, a map on a magenta background, dated March 1995. The later screenshot is dated May 1997. Both are in the [artwork exhibit](../artwork/).

## Rebuilding the little man in MANEDIT

The little man in this exhibit does not appear in Apache’s missions. He is the preview figure from MANEDIT, a development tool left on the CD with 110 text files for walking, kneeling, signalling and other movements. Apache does not use these animation sequences.

The archive also contains unused human models, including [TestMan](../models/#640) and [USInftry](../models/#984). These have no active actor definitions or placements in the four terrain maps or 110 missions. The editor and its files give us a look at the studio’s animation tools alongside the game we came to investigate.

MANEDIT announces itself as “SCAWEN ROBERTS - MANEDIT 1.05”. Open one of its pose files and the animation is right there as rows of numbers, with a duration at the top.

Finding the figure took another step. There isn't a separate model file for it. The editor constructs its nineteen parts directly from constants in the executable: torso, head, arms, legs, feet, toes and a held weapon. We ran that constructor, recovered the geometry, and followed the interpolation and joint rotations used to animate it.

<figure><a href="../poses/"><img src="../images/poses.png" width="1200" height="750" alt="The reconstructed nineteen-part MANEDIT figure in a walking pose"></a><figcaption>MANEDIT’s preview figure, recovered from the editor executable. Choose a motion and scrub through it in the browser.</figcaption></figure>

The [animation exhibit](../poses/) plays 104 sequences accepted by that editor. The identical MANEDIT executable also ships with the Hind demo. Elsewhere in Apache’s `3DDATA` directory, a file called `RGB` turns out to be a directory listing of `E:\HIND\3DDATA`, dated February 1996. These are traces of Digital Integration’s shared development work, preserved on the release discs.

## Getting the helicopter to behave

Rendering comparisons give us a picture to work towards. Flight physics needs a different approach. We fed the original and reconstructed models the same inputs and followed their state over time, through hover, forward flight, wind, engine failures, fuel exhaustion and hard landings.

The realistic model accounts for altitude and air density, weight, ground effect within 48 feet of the surface, and the balance between available rotor torque and required torque. Engines and rotor respond at different rates. Descent can keep the rotor turning after engine failure, with collective affecting that windmilling behaviour. Fuel consumption reduces weight, while excessive torque and heat can accumulate into damage.

Arcade mode has a separate model, with its own input shaping and height control. It also has a small bookkeeping mistake: initial fuel weight gets added twice. A fresh mission with 2,442 lb of fuel starts at 18,942 lb instead of 16,500 lb. Stepping through the initializer made the cause quite unambiguous.

We used the same comparison approach for weapons, instruments, mission logic and sound. Screenshots helped find the big visible problems; controlled inputs and state comparisons caught the details that would be difficult to reproduce by hand in a busy mission.

## Running again

The result is [Apache C++](https://github.com/Lost-Engines/apache-cpp), with the original software renderer, flight models, combat, cockpits, mission planner, speech and music running on modern systems. [Apache Redux](https://github.com/Lost-Engines/apache-redux) builds on it with arbitrary resolution, adjustable field of view, longer model detail distances and a few gameplay fixes. Parked aircraft keep their landing gear down and stop throwing countermeasures at us, for a start.

The viewers here grew out of questions we needed to answer while rebuilding the game. They also make a good way to spend an afternoon with its artwork. Pick an aircraft, trace its components, follow a mission across Cyprus, or watch the little MANEDIT figure walk. There's a lot packed into those discs.
