const { newQuickJSWASMModuleFromVariant, RELEASE_SYNC } = require("quickjs-emscripten");

async function testDisposalOrder() {
  console.log("=== Testing disposal order ===\n");
  
  const QuickJS = await newQuickJSWASMModuleFromVariant(RELEASE_SYNC);
  
  // Test 1: Dispose context before runtime
  console.log("Test 1: Dispose context before runtime");
  try {
    const runtime1 = QuickJS.newRuntime();
    const vm1 = runtime1.newContext();
    
    vm1.evalCode("globalThis.test = \"hello\"");
    
    vm1.dispose();
    console.log("Context disposed");
    
    runtime1.dispose();
    console.log("Runtime disposed - SUCCESS\n");
  } catch (e) {
    console.error("Failed:", e.message, "\n");
  }
  
  // Test 2: evalCode result NOT disposed
  console.log("Test 2: evalCode result NOT disposed (should fail)");
  try {
    const runtime2 = QuickJS.newRuntime();
    const vm2 = runtime2.newContext();
    
    const result = vm2.evalCode("1 + 1");
    // NOT disposing result.value\!
    
    vm2.dispose();
    console.log("Context disposed");
    
    runtime2.dispose();
    console.log("Runtime disposed - This should fail");
  } catch (e) {
    console.error("Expected failure:", e.message, "\n");
  }
}

testDisposalOrder().catch(console.error);
