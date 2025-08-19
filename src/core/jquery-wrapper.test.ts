import { describe, it, expect } from '@jest/globals';
import { createSmartDollar } from './jquery-wrapper';

describe('jQuery-wrapper (Smart $ functionality)', () => {
  describe('Basic $ constructor behavior', () => {
    it('should act as constructor with arguments', () => {
      const data = { users: [{ name: 'Alice' }] };
      const $ = createSmartDollar(data);
      
      const result = $([1, 2, 3]);
      expect(result.value).toEqual([1, 2, 3]);
    });

    it('should return root data when called without arguments', () => {
      const data = { users: [{ name: 'Alice' }] };
      const $ = createSmartDollar(data);
      
      const result = $();
      expect(result.value).toEqual(data);
    });

    it('should have valueOf return original data', () => {
      const data = { name: 'Alice', age: 30 };
      const $ = createSmartDollar(data);
      
      expect($.valueOf()).toEqual(data);
    });

    it('should have toString return JSON string', () => {
      const data = { name: 'Alice', age: 30 };
      const $ = createSmartDollar(data);
      
      expect($.toString()).toBe(JSON.stringify(data));
    });
  });

  describe('Object property access', () => {
    it('should expose object properties as chainable wrappers', () => {
      const data = {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 }
        ],
        config: {
          theme: 'dark',
          language: 'en'
        }
      };
      const $ = createSmartDollar(data) as any;

      expect($.users.value).toEqual(data.users);
      expect($.config.value).toEqual(data.config);
      expect($.config.theme.value).toBe('dark');
    });

    it('should handle nested object access', () => {
      const data = {
        app: {
          settings: {
            ui: {
              theme: 'dark',
              fontSize: 14
            }
          }
        }
      };
      const $ = createSmartDollar(data) as any;

      expect($.app.settings.ui.theme.value).toBe('dark');
      expect($.app.settings.ui.fontSize.value).toBe(14);
    });

    it('should allow chaining operations on properties', () => {
      const data = {
        users: [
          { name: 'Alice', age: 30, active: true },
          { name: 'Bob', age: 25, active: false },
          { name: 'Charlie', age: 35, active: true }
        ]
      };
      const $ = createSmartDollar(data) as any;

      const activeUsers = $.users.filter((user: any) => user.active).pluck('name');
      expect(activeUsers.value).toEqual(['Alice', 'Charlie']);
    });
  });

  describe('Array handling', () => {
    it('should handle array data directly', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 }
      ];
      const $ = createSmartDollar(data) as any;

      // $ should act like the array wrapper
      expect($.data).toEqual(data);
      expect($.filter).toBeDefined();
      expect($.map).toBeDefined();
    });

    it('should allow chaining on array data', () => {
      const data = [
        { name: 'Alice', department: 'engineering', salary: 70000 },
        { name: 'Bob', department: 'design', salary: 50000 },
        { name: 'Charlie', department: 'engineering', salary: 80000 }
      ];
      const $ = createSmartDollar(data) as any;

      const engineeringNames = $.filter((person: any) => person.department === 'engineering')
                                .sortBy('salary')
                                .pluck('name');
      
      expect(engineeringNames.value).toEqual(['Alice', 'Charlie']);
    });
  });

  describe('Complex data structures', () => {
    it('should handle mixed complex data', () => {
      const data = {
        metadata: {
          version: '1.0',
          created: '2023-01-01'
        },
        users: [
          {
            id: 1,
            profile: {
              name: 'Alice',
              contact: {
                email: 'alice@example.com',
                phone: '555-0001'
              }
            },
            orders: [
              { id: 101, amount: 250.00, status: 'completed' },
              { id: 102, amount: 150.00, status: 'pending' }
            ]
          },
          {
            id: 2,
            profile: {
              name: 'Bob',
              contact: {
                email: 'bob@example.com',
                phone: '555-0002'
              }
            },
            orders: [
              { id: 201, amount: 300.00, status: 'completed' }
            ]
          }
        ],
        summary: {
          totalUsers: 2,
          totalOrders: 3
        }
      };

      const $ = createSmartDollar(data) as any;

      // Test metadata access
      expect($.metadata.version.value).toBe('1.0');

      // Test user filtering and property plucking
      const userEmails = $.users.pluck('profile').pluck('contact').pluck('email');
      expect(userEmails.value).toEqual(['alice@example.com', 'bob@example.com']);

      // Test summary access
      expect($.summary.totalUsers.value).toBe(2);

      // Test complex chaining with nested data
      const completedOrderAmounts = $.users
        .map((user: any) => user.orders)
        .map((orders: any) => orders.filter((order: any) => order.status === 'completed'))
        .map((completedOrders: any) => completedOrders.map((order: any) => order.amount))
        .value;

      // This should give us arrays of amounts for completed orders per user
      expect(completedOrderAmounts).toEqual([
        [250.00], // Alice's completed orders
        [300.00]  // Bob's completed orders
      ]);
    });
  });

  describe('Edge cases', () => {
    it('should handle null data', () => {
      const $ = createSmartDollar(null);
      
      expect($.valueOf()).toBe(null);
      expect($.toString()).toBe('null');
    });

    it('should handle undefined data', () => {
      const $ = createSmartDollar(undefined);
      
      expect($.valueOf()).toBe(undefined);
      expect($.toString()).toBe(String(undefined));
    });

    it('should handle primitive data', () => {
      const $ = createSmartDollar(42);
      
      expect($.valueOf()).toBe(42);
      expect($.toString()).toBe('42');
    });

    it('should handle string data', () => {
      const $ = createSmartDollar('hello world');
      
      expect($.valueOf()).toBe('hello world');
      expect($.toString()).toBe('hello world');
    });

    it('should handle empty object', () => {
      const $ = createSmartDollar({}) as any;
      
      expect($.valueOf()).toEqual({});
      expect($.toString()).toBe('{}');
      
      // Should not have any enumerable properties
      expect(Object.keys($).filter(key => key !== 'valueOf' && key !== 'toString')).toEqual([]);
    });

    it('should handle empty array', () => {
      const $ = createSmartDollar([]) as any;
      
      expect($.valueOf()).toEqual([]);
      expect($.data).toEqual([]);
      
      // Should have array methods available
      expect($.filter).toBeDefined();
      expect($.map).toBeDefined();
      expect($.length).toBeDefined();
    });
  });

  describe('jQuery-like usage patterns', () => {
    it('should support typical jQuery-style data manipulation', () => {
      const data = {
        products: [
          { id: 1, name: 'Laptop', price: 999, category: 'electronics', inStock: true },
          { id: 2, name: 'Mouse', price: 25, category: 'electronics', inStock: true },
          { id: 3, name: 'Book', price: 15, category: 'books', inStock: false },
          { id: 4, name: 'Phone', price: 699, category: 'electronics', inStock: true }
        ]
      };

      const $ = createSmartDollar(data) as any;

      // Find all electronics products in stock, sorted by price
      const affordableElectronics = $.products
        .where('category', 'electronics')
        .where('inStock', true)
        .filter((product: any) => product.price < 500)
        .sortBy('price')
        .pluck('name');

      expect(affordableElectronics.value).toEqual(['Mouse']);

      // Get total value of in-stock items
      const totalValue = $.products
        .where('inStock', true)
        .sum('price');

      expect(totalValue.value).toBe(999 + 25 + 699); // 1723
    });

    it('should support data transformation patterns', () => {
      const data = {
        sales: [
          { quarter: 'Q1', revenue: 100000, costs: 80000 },
          { quarter: 'Q2', revenue: 120000, costs: 85000 },
          { quarter: 'Q3', revenue: 110000, costs: 90000 },
          { quarter: 'Q4', revenue: 140000, costs: 95000 }
        ]
      };

      const $ = createSmartDollar(data) as any;

      // Calculate profit margins
      const profitMargins = $.sales.map((sale: any) => ({
        quarter: sale.quarter,
        profit: sale.revenue - sale.costs,
        margin: ((sale.revenue - sale.costs) / sale.revenue * 100).toFixed(2) + '%'
      }));

      expect(profitMargins.value).toEqual([
        { quarter: 'Q1', profit: 20000, margin: '20.00%' },
        { quarter: 'Q2', profit: 35000, margin: '29.17%' },
        { quarter: 'Q3', profit: 20000, margin: '18.18%' },
        { quarter: 'Q4', profit: 45000, margin: '32.14%' }
      ]);
    });
  });
});