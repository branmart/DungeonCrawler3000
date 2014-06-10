(function(name,data){
 if(typeof onTileMapLoaded === 'undefined') {
  if(typeof TileMaps === 'undefined') TileMaps = {};
  TileMaps[name] = data;
 } else {
  onTileMapLoaded(name,data);
 }})("Dungeon Map",
{ "height":50,
 "layers":[
        {
         "data":[400, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 402, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 149, 400, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 402, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 239, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 149, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 179, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 209, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 239, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 149, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 179, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 209, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 239, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 149, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 179, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 209, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 239, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 149, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 179, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 209, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 239, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 460, 461, 461, 461, 461, 461, 461, 461, 461, 461, 461, 461, 461, 461, 461, 461, 461, 461, 461, 461, 461, 461, 461, 462, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 149, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 277, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 179, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 209, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 239, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 149, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 179, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 209, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 239, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 149, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 179, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 209, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 239, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 149, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 179, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 209, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 239, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 400, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 402, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 149, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 179, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 209, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 239, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 149, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 179, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 209, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 239, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 149, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 179, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 209, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 239, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 149, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 179, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 307, 308, 308, 308, 308, 308, 308, 308, 308, 308, 309, 209, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 432, 430, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 431, 284, 284, 284, 284, 284, 284, 432, 337, 338, 338, 338, 338, 338, 338, 338, 338, 338, 339, 239, 460, 461, 461, 461, 461, 461, 461, 461, 461, 461, 461, 461, 461, 462],
         "height":50,
         "name":"Tile Layer 1",
         "opacity":1,
         "type":"tilelayer",
         "visible":true,
         "width":50,
         "x":0,
         "y":0
        }],
 "orientation":"orthogonal",
 "properties":
    {

    },
 "tileheight":16,
 "tilesets":[
        {
         "firstgid":1,
         "image":"..\/..\/..\/..\/..\/Program Files (x86)\/Tiled\/util\/java\/libtiled-java\/test\/tiled\/io\/resources\/dang02_b.png",
         "imageheight":256,
         "imagewidth":480,
         "margin":0,
         "name":"dang02_b",
         "properties":
            {

            },
         "spacing":0,
         "tileheight":16,
         "tilewidth":16
        }],
 "tilewidth":16,
 "version":1,
 "width":50
});