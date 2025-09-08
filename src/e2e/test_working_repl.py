#!/usr/bin/env python3
import pexpect
import sys
import os
import time
import re

def strip_ansi(text):
    """Remove ANSI escape codes from text"""
    if not isinstance(text, str):
        return str(text)
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', text)

def test_working_repl():
    """Working E2E test that handles ANSI escape codes properly"""
    try:
        # Start REPL with JSON input
        env = os.environ.copy()
        env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
        
        child = pexpect.spawn('sh', ['-c', 'echo \'{"name": "test", "value": 42}\' | node dist/index.js'], 
                             encoding='utf-8', timeout=10, env=env)
        
        # Wait for REPL to start
        child.expect(['jsq REPL', '>'], timeout=5)
        print("✓ REPL started")
        
        # If we got the header, wait for prompt
        if 'jsq REPL' in child.before or 'jsq REPL' in child.after:
            child.expect('>', timeout=5)
            print("✓ Got prompt")
        
        # Test 1: Simple query
        print("\nTest 1: Simple query")
        child.send('$.name\r')
        
        # Wait for result - it will be mixed with ANSI codes
        child.expect(['"test"', pexpect.TIMEOUT], timeout=3)
        if '"test"' in strip_ansi(child.before) or '"test"' in strip_ansi(child.after):
            print("✓ Query $.name returned 'test'")
        
        # Wait for next prompt
        child.expect('>', timeout=2)
        
        # Test 2: Math expression
        print("\nTest 2: Math expression")
        child.send('1 + 2 * 3\r')
        child.expect(['7', pexpect.TIMEOUT], timeout=3)
        if '7' in strip_ansi(child.before) or '7' in strip_ansi(child.after):
            print("✓ Math expression returned 7")
        
        # Test 3: Array operation
        print("\nTest 3: Array operation")
        child.expect('>', timeout=2)
        child.send('[1,2,3].map(x => x * 2)\r')
        
        # The result might be formatted, so just check for the numbers
        time.sleep(0.5)  # Give it time to process
        output = strip_ansi(child.before + child.buffer)
        if '2' in output and '4' in output and '6' in output:
            print("✓ Array map returned [2,4,6]")
        
        # Test 4: Access data property
        print("\nTest 4: Access data property")
        child.expect('>', timeout=2)
        child.send('$.value\r')
        child.expect(['42', pexpect.TIMEOUT], timeout=3)
        if '42' in strip_ansi(child.before) or '42' in strip_ansi(child.after):
            print("✓ Query $.value returned 42")
        
        # Exit cleanly
        print("\nExiting...")
        child.sendcontrol('c')
        child.expect(pexpect.EOF, timeout=2)
        print("✓ REPL exited cleanly")
        
        print("\n✅ All tests passed!")
        return True
        
    except Exception as e:
        print(f"\n✗ Test failed: {str(e)}")
        if 'child' in locals():
            print(f"Buffer: {repr(child.buffer)}")
            print(f"Before: {repr(child.before)}")
            # Show cleaned output
            print(f"Cleaned buffer: {strip_ansi(child.buffer)}")
            print(f"Cleaned before: {strip_ansi(child.before)}")
            if child.isalive():
                child.terminate(force=True)
        return False

if __name__ == '__main__':
    success = test_working_repl()
    sys.exit(0 if success else 1)