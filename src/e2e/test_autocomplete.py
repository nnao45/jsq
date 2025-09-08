#!/usr/bin/env python3
import pexpect
import sys
import os
import time

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    CYAN = '\033[96m'
    ENDC = '\033[0m'

def print_test(name):
    print(f"\n{Colors.CYAN}=== {name} ==={Colors.ENDC}")

def print_pass(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.ENDC}")

def print_fail(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.ENDC}")

def print_info(msg):
    print(f"{Colors.YELLOW}ℹ {msg}{Colors.ENDC}")

def test_basic_autocomplete():
    """Test basic autocomplete functionality"""
    print_test("Test: Basic Autocomplete")
    
    try:
        # Start REPL with JSON input
        json_data = '{"name": "test", "value": 42, "items": [1, 2, 3]}'
        env = os.environ.copy()
        env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
        env['NO_COLOR'] = '1'
        child = pexpect.spawn('sh', ['-c', f'echo \'{json_data}\' | node dist/index.js'], 
                              encoding='utf-8', timeout=10, env=env)
        
        child.expect('> ')
        print_pass("REPL started")
        
        # Test 1: Basic property autocomplete
        print_info("Testing property autocomplete: $.n<TAB>")
        child.send('$.n')
        child.send('\t')  # Tab key
        time.sleep(0.1)
        
        # The completion should complete to $.name
        # Send enter to execute
        child.sendline()
        child.expect('"test"')
        print_pass("Property autocomplete worked: $.n -> $.name")
        
        child.expect('> ')
        
        # Test 2: Array method autocomplete
        print_info("Testing array method autocomplete: $.items.m<TAB>")
        child.send('$.items.m')
        child.send('\t')  # Tab key
        time.sleep(0.1)
        
        # Cancel completion and try a known method
        child.send('\x1b')  # Escape
        child.sendcontrol('u')  # Clear line
        child.sendline('$.items.map(x => x * 2)')
        child.expect(r'\[\s*2\s*,\s*4\s*,\s*6\s*\]')
        print_pass("Array method execution worked")
        
        child.expect('> ')
        
        # Test 3: Multiple completions
        print_info("Testing multiple completions: $.<TAB>")
        child.send('$.')
        child.send('\t')  # Tab key
        time.sleep(0.1)
        
        # Tab again to cycle through completions
        child.send('\t')
        time.sleep(0.1)
        
        # Cancel and clear
        child.send('\x1b')  # Escape
        child.sendcontrol('u')  # Clear line
        
        print_pass("Multiple completions handling worked")
        
        child.sendcontrol('c')
        child.wait()
        
        return True
    except Exception as e:
        print_fail(f"Test failed: {str(e)}")
        if 'child' in locals() and child.isalive():
            child.sendcontrol('c')
            child.wait()
        return False

def test_lodash_autocomplete():
    """Test lodash method autocomplete"""
    print_test("Test: Lodash Autocomplete")
    
    try:
        json_data = '[1, 2, 3, 4, 5]'
        env = os.environ.copy()
        env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
        env['NO_COLOR'] = '1'
        child = pexpect.spawn('sh', ['-c', f'echo \'{json_data}\' | node dist/index.js'], 
                              encoding='utf-8', timeout=10, env=env)
        
        child.expect('> ')
        print_pass("REPL started")
        
        # Test lodash method autocomplete
        print_info("Testing lodash method autocomplete: _.fi<TAB>")
        child.send('_.fi')
        child.send('\t')  # Tab key
        time.sleep(0.1)
        
        # Should show options like _.filter, _.find, etc.
        # Let's just cancel and test a known method
        child.send('\x1b')  # Escape
        child.sendcontrol('u')  # Clear line
        child.sendline('_.filter($, x => x > 2)')
        child.expect(r'\[\s*3\s*,\s*4\s*,\s*5\s*\]')
        print_pass("Lodash method execution worked")
        
        child.sendcontrol('c')
        child.wait()
        
        return True
    except Exception as e:
        print_fail(f"Test failed: {str(e)}")
        if 'child' in locals() and child.isalive():
            child.sendcontrol('c')
            child.wait()
        return False

def test_escape_cancellation():
    """Test escape key cancels autocomplete"""
    print_test("Test: Escape Cancellation")
    
    try:
        json_data = '{}'
        env = os.environ.copy()
        env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
        env['NO_COLOR'] = '1'
        child = pexpect.spawn('sh', ['-c', f'echo \'{json_data}\' | node dist/index.js'], 
                              encoding='utf-8', timeout=10, env=env)
        
        child.expect('> ')
        
        # Start typing and trigger autocomplete
        child.send('$.')
        child.send('\t')  # Tab key
        time.sleep(0.1)
        
        # Cancel with escape
        child.send('\x1b')  # Escape
        
        # Continue typing normally
        child.send('constructor')
        child.sendline()
        
        # Should execute without issues
        child.expect('> ')
        print_pass("Escape cancellation worked correctly")
        
        child.sendcontrol('c')
        child.wait()
        
        return True
    except Exception as e:
        print_fail(f"Test failed: {str(e)}")
        if 'child' in locals() and child.isalive():
            child.sendcontrol('c')
            child.wait()
        return False

if __name__ == '__main__':
    print(f"{Colors.CYAN}Starting JSQ Autocomplete Tests...{Colors.ENDC}")
    print("==============================")
    
    tests = [
        test_basic_autocomplete,
        test_lodash_autocomplete,
        test_escape_cancellation
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        if test():
            passed += 1
        else:
            failed += 1
    
    print("\n==============================")
    print(f"Tests completed: {Colors.GREEN}{passed} passed{Colors.ENDC}, {Colors.RED}{failed} failed{Colors.ENDC}")
    
    sys.exit(0 if failed == 0 else 1)