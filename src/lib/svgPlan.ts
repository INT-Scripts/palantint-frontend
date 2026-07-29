// Plan <style> blocks contain hand-written CSS comments with raw "&"
// (e.g. "fill & stroke"), which is invalid XML text content and makes
// DOMParser's image/svg+xml mode fail silently, yielding zero parsed
// paths. Consumers here recolor geometry themselves, so the stylesheet
// is never needed for parsing/rendering — strip it before feeding the
// SVG to SVGLoader (or any other strict-XML parser).
export function stripStyle(svgContent: string) {
  return svgContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
}
