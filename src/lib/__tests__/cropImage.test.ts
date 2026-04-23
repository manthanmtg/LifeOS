import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import getCroppedImg, { createImage, getRadianAngle } from "../cropImage";

type ImageListener = (event: Event) => void;

class MockImage {
  static instances: MockImage[] = [];

  width = 640;
  height = 480;
  crossOrigin?: string;
  private currentSrc = "";
  private listeners = new Map<string, ImageListener>();

  constructor(private autoLoad = false) {
    MockImage.instances.push(this);
  }

  addEventListener(type: string, listener: ImageListener) {
    this.listeners.set(type, listener);
  }

  setSrc(value: string) {
    this.currentSrc = value;
    if (this.autoLoad) {
      queueMicrotask(() => this.emit("load"));
    }
  }

  getSrc() {
    return this.currentSrc;
  }

  get src() {
    return this.currentSrc;
  }

  emit(type: string, event = new Event(type)) {
    this.listeners.get(type)?.(event);
  }
}

function installImageMock(autoLoad = false) {
  MockImage.instances = [];

  vi.stubGlobal(
    "Image",
    class extends MockImage {
      constructor() {
        super(autoLoad);
      }

      set src(value: string) {
        this.setSrc(value);
      }

      get src() {
        return this.getSrc();
      }
    },
  );
}

function createCanvasMock(
  context: CanvasRenderingContext2D | null,
  dataUrl = "data:image/jpeg;base64,cropped-image-data",
) {
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toDataURL: vi.fn(() => dataUrl),
  } as unknown as HTMLCanvasElement;
}

describe("cropImage", () => {
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    installImageMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("createImage", () => {
    it("resolves with the loaded image", async () => {
      const promise = createImage("blob:test-image");
      const image = MockImage.instances[0];

      image.emit("load");

      await expect(promise).resolves.toBe(image);
      expect(image.src).toBe("blob:test-image");
    });

    it("rejects with the image error event", async () => {
      const promise = createImage("broken-image.jpg");
      const error = new Event("error");

      MockImage.instances[0].emit("error", error);

      await expect(promise).rejects.toBe(error);
    });

    it("leaves crossOrigin unset for blob URL compatibility", () => {
      createImage("blob:test-image");

      expect(MockImage.instances[0].crossOrigin).toBeUndefined();
    });
  });

  describe("getRadianAngle", () => {
    it("converts degrees to radians", () => {
      expect(getRadianAngle(0)).toBe(0);
      expect(getRadianAngle(90)).toBeCloseTo(Math.PI / 2);
      expect(getRadianAngle(180)).toBeCloseTo(Math.PI);
      expect(getRadianAngle(-45)).toBeCloseTo(-Math.PI / 4);
    });
  });

  describe("getCroppedImg", () => {
    it("returns null when the source canvas context cannot be created", async () => {
      installImageMock(true);
      const sourceCanvas = createCanvasMock(null);
      vi.spyOn(document, "createElement").mockImplementation((tagName) => {
        if (tagName === "canvas") {
          return sourceCanvas;
        }
        return originalCreateElement(tagName);
      });

      await expect(
        getCroppedImg("source.jpg", { x: 0, y: 0, width: 100, height: 80 }),
      ).resolves.toBeNull();
      expect(sourceCanvas.getContext).toHaveBeenCalledWith("2d");
    });

    it("returns null when the cropped canvas context cannot be created", async () => {
      installImageMock(true);
      const sourceContext = {
        translate: vi.fn(),
        rotate: vi.fn(),
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
      const sourceCanvas = createCanvasMock(sourceContext);
      const croppedCanvas = createCanvasMock(null);
      const canvases = [sourceCanvas, croppedCanvas];

      vi.spyOn(document, "createElement").mockImplementation((tagName) => {
        if (tagName === "canvas") {
          return canvases.shift() ?? croppedCanvas;
        }
        return originalCreateElement(tagName);
      });

      await expect(
        getCroppedImg("source.jpg", { x: 10, y: 20, width: 100, height: 80 }),
      ).resolves.toBeNull();
      expect(croppedCanvas.getContext).toHaveBeenCalledWith("2d");
    });

    it("rotates, crops, and returns jpeg base64 data", async () => {
      installImageMock(true);
      const sourceContext = {
        translate: vi.fn(),
        rotate: vi.fn(),
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
      const croppedContext = {
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
      const sourceCanvas = createCanvasMock(sourceContext);
      const croppedCanvas = createCanvasMock(croppedContext);
      const canvases = [sourceCanvas, croppedCanvas];

      vi.spyOn(document, "createElement").mockImplementation((tagName) => {
        if (tagName === "canvas") {
          return canvases.shift() ?? croppedCanvas;
        }
        return originalCreateElement(tagName);
      });

      await expect(
        getCroppedImg(
          "source.jpg",
          { x: 12, y: 24, width: 160, height: 90 },
          90,
        ),
      ).resolves.toEqual({
        data: "cropped-image-data",
        contentType: "image/jpeg",
      });

      expect(sourceCanvas.width).toBe(640);
      expect(sourceCanvas.height).toBe(480);
      expect(sourceContext.translate).toHaveBeenNthCalledWith(1, 320, 240);
      expect(sourceContext.rotate).toHaveBeenCalledWith(Math.PI / 2);
      expect(sourceContext.translate).toHaveBeenNthCalledWith(2, -320, -240);
      expect(sourceContext.drawImage).toHaveBeenCalledWith(
        MockImage.instances[0],
        0,
        0,
      );
      expect(croppedCanvas.width).toBe(160);
      expect(croppedCanvas.height).toBe(90);
      expect(croppedContext.drawImage).toHaveBeenCalledWith(
        sourceCanvas,
        12,
        24,
        160,
        90,
        0,
        0,
        160,
        90,
      );
      expect(croppedCanvas.toDataURL).toHaveBeenCalledWith("image/jpeg", 0.9);
    });
  });
});
