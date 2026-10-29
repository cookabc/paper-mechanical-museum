# Third-party origins, attribution and licences

This project keeps the original product's author attribution. It does not sign the whole mechanical museum over to a single upstream author.

## Colorfigures / ISO-GLOW / iso-figure

The original isometric SVG core and the washing machine come from April Zhu's Colorfigures, whose own core comments record its descent from ISO-GLOW and Tolga Cohce's iso-figure. The main hall and the grabber machine reuse and extend that foundation. The fan, its standalone Paper3D implementation and the scenes and interactions added later are not therefore wholly attributable to the upstream author.

Official source: https://april-zhu.com/colorfigures
Official source package: https://april-zhu.com/colorfigures/colorfigures.zip

`licenses/Colorfigures-LICENSE.txt` is the complete MIT text preserved from `colorfigures/LICENSE` in the official package, including all three original copyright statements; SHA-256: `bc54cadb579906c051d7aad84f41f88c0df6c50089e052134226fe0b76fd5280`.

That licence must travel with the corresponding original code and its derived parts. The scenes, navigation, mechanism observation and tests added here are not thereby granted a new repository-wide open-source licence.

## Test tooling

Optional npm development dependencies are used only for automated DOM and image testing and do not ship with the site; each dependency keeps its own licence. The Python image helpers may need Pillow, NumPy or Inkscape — see the development guide.

---

中文版见 [THIRD_PARTY_NOTICES.zh-CN.md](THIRD_PARTY_NOTICES.zh-CN.md)。
