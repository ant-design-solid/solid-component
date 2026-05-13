import { afterEach, beforeAll } from "vitest";
import {
  installResizeObserverMock,
  resetResizeObserverMock,
} from "./resize-observer";

beforeAll(() => {
  installResizeObserverMock();
});

afterEach(() => {
  resetResizeObserverMock();
});
