#!/usr/bin/env python3
import pexpect
import sys
import os
import time

def test_simple_repl():
    """Test basic REPL functionality with minimal expectations"""
    try:
        # Start REPL with simple echo input
        env = os.environ.copy()
        # Disable color and real-time eval
        env['NO_COLOR'] = '1'
        env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
        # Use simpler terminal
        env['TERM'] = 'dumb'
        
        # Start REPL by piping JSON data
        cmd = 'echo \'{"test": 123}\' | node dist/index.js'
        child = pexpect.spawn('sh', ['-c', cmd], encoding='utf-8', timeout=10, env=env)
        
        print("Starting REPL...")
        
        # Wait for any text that indicates REPL started
        index = child.expect(['jsq REPL', '>', pexpect.TIMEOUT], timeout=5)
        if index == 2:
            print(f"Timeout waiting for REPL start")
            print(f"Output so far: {repr(child.before)}")
            return False
        
        print("✓ REPL started")
        
        # If we got the header, wait for prompt
        if index == 0:
            child.expect('>', timeout=5)
            print("✓ Prompt appeared")
        
        # Send a simple expression and wait for echo
        child.send('$.test\r')
        time.sleep(0.1)  # Give it time to process
        
        # Read whatever is available
        child.expect('123')
        print("✓ Query result received: 123")
        
        # Send Ctrl+C to exit
        child.sendcontrol('c')
        time.sleep(0.1)
        
        # Wait for process to end
        child.expect(pexpect.EOF, timeout=2)
        print("✓ REPL exited cleanly")
        
        return True
        
    except Exception as e:
        print(f"✗ Test failed: {str(e)}")
        if 'child' in locals():
            print(f"Buffer: {repr(child.buffer)}")
            print(f"Before: {repr(child.before)}")
            if child.isalive():
                child.terminate(force=True)
        return False

if __name__ == '__main__':
    success = test_simple_repl()
    if success:
        print("\n✅ Test passed!")
    else:
        print("\n❌ Test failed!")
    sys.exit(0 if success else 1)