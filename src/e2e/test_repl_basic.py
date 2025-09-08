#!/usr/bin/env python3
import pexpect
import sys
import os
import time

def test_repl_basic():
    """Test basic REPL functionality"""
    try:
        # Start REPL without input data
        env = os.environ.copy()
        env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
        env['NO_COLOR'] = '1'
        env['TERM'] = 'xterm'
        
        # Use --repl flag to ensure REPL mode
        child = pexpect.spawn('node', ['dist/index.js', '--repl'], 
                              encoding='utf-8', timeout=10, env=env)
        
        print(f"Process started with PID: {child.pid}")
        
        # Wait for prompt - REPL should start immediately in no-input mode
        index = child.expect(['> ', 'jsq REPL', pexpect.TIMEOUT], timeout=5)
        if index == 2:
            print(f"Timeout waiting for prompt")
            print(f"Current output: {repr(child.before)}")
            print(f"Buffer: {repr(child.buffer)}")
            raise Exception("REPL did not start properly")
        
        print("✓ REPL started and prompt appeared")
        
        # If we got the header, wait for the actual prompt
        if index == 1:
            child.expect('> ', timeout=5)
            print("✓ Got prompt after header")
        
        # Test simple expression
        child.sendline('1 + 1')
        child.expect('2')
        print("✓ Simple math expression worked")
        
        # Wait for next prompt
        child.expect('> ')
        print("✓ New prompt after expression")
        
        # Test another expression
        child.sendline('"hello" + " world"')
        child.expect('"hello world"')
        print("✓ String concatenation worked")
        
        # Exit REPL with Ctrl+C
        child.sendcontrol('c')
        
        # Give it time to exit
        time.sleep(0.5)
        
        # Check if process exited
        if not child.isalive():
            print("✓ REPL exited cleanly")
        else:
            child.terminate(force=True)
            print("✓ REPL terminated")
        
        print("\n✅ All tests passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        if 'child' in locals() and child.isalive():
            try:
                print(f"Buffer content: {repr(child.buffer)}")
                print(f"Before content: {repr(child.before)}")
            except:
                pass
            child.terminate(force=True)
        return False

if __name__ == '__main__':
    success = test_repl_basic()
    sys.exit(0 if success else 1)