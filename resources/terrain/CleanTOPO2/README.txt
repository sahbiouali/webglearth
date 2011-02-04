The first simple DEM dataset for WebGL Earth derived from CleanTOPO2:
http://www.shadedrelief.com/cleantopo2/

Mercator tiles comprise only Terrestrial (land) elevation.
Bathymetry data are stripped.

Data are encoded as PNG Grayscale with 8-bit (byte) - so with data range 0..255 for elevation 0m to 8,248m over the sea level.
This means data are not precise, elevation has discreet values with about 32 meters. Tiles are available only to level 5 (4.8 km / pixel at Equator).

Original data:
Extent: 180 West to 180 East, 90 North to 90 South
Size: 10,800 height samples wide x 5,400 high
Resolution: 2-arc minute (about 3.7 km/degree)
Elevation range: -10,701m to 8,248m 
Data range: 0 to 18948.

The directory contains also CleanTOPO2small16bit.png which is 10% downscaled (to 1080x540px) png with 16-bit grayscale to test if such format is readable (as 16bit texture) via WebGL.

--
Petr Pridal, Klokan Technologies GmbH
petr.pridal@klokantech.com
