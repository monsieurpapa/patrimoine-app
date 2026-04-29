import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';

let testEnv;

describe('Firestore Security Rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'heritage-test-project',
      firestore: {
        rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  // Owner Tests
  it('allows owner to read and write their own data', async () => {
    const db = testEnv.authenticatedContext('owner1').firestore();
    await assertSucceeds(db.collection('assets').doc('owner1').set({ test: true }));
    await assertSucceeds(db.collection('catalog').doc('owner1').get());
  });

  it('denies owner from reading other owner data', async () => {
    const db = testEnv.authenticatedContext('owner1').firestore();
    await assertFails(db.collection('catalog').doc('owner2').get());
  });

  // Manager Tests
  describe('Manager Access', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection('roles').doc('manager1').set({
          role: 'manager',
          ownerId: 'owner1',
          assets: [{ id: 'asset1' }]
        });
      });
    });

    it('allows manager to read their owner catalog', async () => {
      const db = testEnv.authenticatedContext('manager1').firestore();
      await assertSucceeds(db.collection('catalog').doc('owner1').get());
    });

    it('denies manager from reading other owner catalog', async () => {
      const db = testEnv.authenticatedContext('manager1').firestore();
      await assertFails(db.collection('catalog').doc('owner2').get());
    });

    it('allows manager to create a sale for assigned asset with items', async () => {
      const db = testEnv.authenticatedContext('manager1').firestore();
      await assertSucceeds(db.collection('sales').doc('sale1').set({
        ownerId: 'owner1',
        managerId: 'manager1',
        assetId: 'asset1',
        items: [{ id: 'item1', quantity: 1 }]
      }));
    });

    it('denies manager from creating empty sale (T6 validation)', async () => {
      const db = testEnv.authenticatedContext('manager1').firestore();
      await assertFails(db.collection('sales').doc('sale2').set({
        ownerId: 'owner1',
        managerId: 'manager1',
        assetId: 'asset1',
        items: []
      }));
    });

    it('denies manager from creating a sale for unassigned asset', async () => {
      const db = testEnv.authenticatedContext('manager1').firestore();
      await assertFails(db.collection('sales').doc('sale3').set({
        ownerId: 'owner1',
        managerId: 'manager1',
        assetId: 'asset2', // Not assigned
        items: [{ id: 'item1', quantity: 1 }]
      }));
    });
  });
});
