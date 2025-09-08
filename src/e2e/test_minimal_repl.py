#!/usr/bin/env python3
import pexpect
import sys
import os
import time

def test_minimal_repl():
    """Minimal REPL test focusing on core functionality"""
    try:
        # Start REPL
        env = os.environ.copy()
        env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
        
        print("Starting REPL...")
        child = pexpect.spawn('sh', ['-c', 'echo \'{"x": 5}\' | node dist/index.js'], 
                             encoding='utf-8', timeout=10, env=env)
        
        # Wait for any sign of REPL starting
        child.expect(['>', 'jsq'], timeout=5)
        print("✓ REPL started")
        
        # Send a simple expression and immediately send enter
        print("\nSending expression: '$.x'")
        child.sendline('$.x')
        
        # Wait a bit for processing
        time.sleep(0.5)
        
        # Check if '5' appears anywhere in the output
        all_output = child.before + child.buffer
        print(f"\nRaw output: {repr(all_output)}")
        
        # Look for the number 5 in the output
        if '5' in all_output:
            print("✓ Found result '5' in output")
            success = True
        else:
            print("✗ Result '5' not found in output")
            success = False
        
        # Try to exit cleanly
        child.sendcontrol('c')
        time.sleep(0.2)
        
        # Force termination if still alive
        if child.isalive():
            child.terminate(force=True)
        
        return success
        
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        if 'child' in locals() and child.isalive():
            child.terminate(force=True)
        return False

if __name__ == '__main__':
    success = test_minimal_repl()
    print(f"\n{'✅ Test passed!' if success else '❌ Test failed!'}")
    sys.exit(0 if success else 1)