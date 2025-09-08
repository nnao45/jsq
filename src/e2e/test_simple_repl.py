#!/usr/bin/env python3
import pexpect
import sys
import os
import time

def test_simple_repl():
    """Test simple REPL interaction"""
    try:
        # Start REPL with JSON input
        json_data = '{"name": "test", "value": 42}'
        env = os.environ.copy()
        env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
        env['NO_COLOR'] = '1'
        env['TERM'] = 'xterm'  # Ensure terminal type is set
        child = pexpect.spawn('sh', ['-c', f'echo \'{json_data}\' | node dist/index.js'], 
                              encoding='utf-8', timeout=10, env=env)
        
        print(f"Process started with PID: {child.pid}")
        
        # Give it a moment to start
        time.sleep(0.5)
        
        # Check REPL header with more flexible pattern
        try:
            child.expect(['jsq REPL', 'Interactive JSON Query Tool', '>'], timeout=5)
        except pexpect.TIMEOUT:
            print(f"Timeout waiting for REPL header")
            print(f"Current output: {repr(child.before)}")
            raise
        print("✓ REPL started")
        
        # Check prompt
        child.expect('> ')
        print("✓ Prompt appeared")
        
        # Test basic expression
        child.sendline('$.name')
        child.expect('"test"')
        print("✓ Basic query worked")
        
        # Wait for prompt after result
        child.expect('> ')
        print("✓ New prompt after query")
        
        # Exit REPL
        child.sendcontrol('c')
        child.wait()
        
        print("\n✓ Test passed!")
        return True
    except Exception as e:
        print(f"\n✗ Test failed: {str(e)}")
        if 'child' in locals() and child.isalive():
            try:
                print(f"Buffer content: {repr(child.buffer)}")
                print(f"Before content: {repr(child.before)}")
            except:
                pass
            child.sendcontrol('c')
            child.wait()
        return False

if __name__ == '__main__':
    success = test_simple_repl()
    sys.exit(0 if success else 1)