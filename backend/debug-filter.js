// Quick debug script to test the isRead filtering logic

const testIsReadLogic = (isReadParam) => {
  console.log(`Input: isReadParam = "${isReadParam}"`);
  console.log(`Type: ${typeof isReadParam}`);

  // Backend controller logic
  const parsedIsRead =
    isReadParam !== undefined ? isReadParam === "true" : undefined;
  console.log(`Parsed: ${parsedIsRead}`);
  console.log(`Type after parsing: ${typeof parsedIsRead}`);

  // Model logic check
  const willFilter = typeof parsedIsRead === "boolean";
  console.log(`Will filter: ${willFilter}`);
  console.log("---");
};

console.log("Testing isRead filtering logic:");
testIsReadLogic("true");
testIsReadLogic("false");
testIsReadLogic(undefined);
