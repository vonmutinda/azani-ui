import { describe, expect, it } from "vitest";
import {
  buildColourPhotoMap,
  colourPhotoMapsEqual,
} from "../../../scripts/lib/colour-photo-mapping.mjs";

const product = {
  handle: "azani-photo-tracksuit",
  photos: [
    { id: 2, colour: "Mocha" },
    { id: 5, colour: "Sand" },
    { id: 7, colour: "Sand" },
  ],
};
const images = [
  { url: "http://localhost:9002/medusa/azani-photo-tracksuit-7-C.png" },
  { url: "http://localhost:9002/medusa/azani-photo-tracksuit-2-A.png" },
  { url: "http://localhost:9002/medusa/azani-photo-tracksuit-5-B.png" },
];

describe("colour photo import", () => {
  it("links colours by original photo IDs even when gallery order differs", () => {
    expect(buildColourPhotoMap(product, images)).toEqual({
      Mocha: ["http://localhost:9002/medusa/azani-photo-tracksuit-2-A.png"],
      Sand: [
        "http://localhost:9002/medusa/azani-photo-tracksuit-5-B.png",
        "http://localhost:9002/medusa/azani-photo-tracksuit-7-C.png",
      ],
    });
  });

  it("rejects missing or ambiguous links rather than guessing a photograph", () => {
    expect(() => buildColourPhotoMap(product, images.slice(0, 2))).toThrow("photo 5");
    expect(() => buildColourPhotoMap(product, [...images, images[0]])).toThrow("photo 7");
  });

  it("recognises unchanged links when database metadata has reordered colour keys", () => {
    const expected = { Mocha: ["mocha.png"], Sand: ["sand.png", "sand-detail.png"] };
    expect(colourPhotoMapsEqual({ Sand: expected.Sand, Mocha: expected.Mocha }, expected)).toBe(
      true,
    );
  });

  it("requires the same colours and photo order, including the primary colour photo", () => {
    const expected = { Sand: ["sand.png", "sand-detail.png"] };
    expect(colourPhotoMapsEqual({ Sand: ["sand-detail.png", "sand.png"] }, expected)).toBe(false);
    expect(colourPhotoMapsEqual({}, expected)).toBe(false);
    expect(colourPhotoMapsEqual({ ...expected, Mocha: ["mocha.png"] }, expected)).toBe(false);
    expect(colourPhotoMapsEqual(null, expected)).toBe(false);
  });
});
