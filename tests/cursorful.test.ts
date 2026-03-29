import test from "node:test";
import assert from "node:assert/strict";
import { chooseEditorWindowIndex, choosePrimaryWindowIndex } from "../src/lib/cursorful";

test("choosePrimaryWindowIndex prefers the recording HUD window", () => {
  const windows = [
    { title: "Cursorful", bodyText: "Load a recording\nLoad latest recording\nExport video" },
    { title: "Cursorful", bodyText: "Select screen\nDisable microphone\nDisable camera\nREC\nEDIT" },
  ];

  assert.equal(choosePrimaryWindowIndex(windows), 1);
});

test("chooseEditorWindowIndex prefers the latest-recording editor shell", () => {
  const windows = [
    { title: "Cursorful", bodyText: "REC\nEDIT" },
    { title: "Cursorful", bodyText: "Old recording timeline\nExport video" },
    { title: "Cursorful", bodyText: "Load a recording\nLoad latest recording\nLoad a video file\nExport video" },
  ];

  assert.equal(chooseEditorWindowIndex(windows), 2);
});

