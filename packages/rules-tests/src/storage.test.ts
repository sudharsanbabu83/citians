import { describe, it } from 'vitest';

import { IDS } from './fixtures';
import {
  assertFails,
  assertSucceeds,
  authedStorage,
  deleteObject,
  getBytes,
  ref,
  seed,
  unauthedStorage,
  uploadBytes,
} from './setup';

const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

describe('Storage — odRequest documents', () => {
  it('denies unauthenticated reads', async () => {
    await seed(IDS);
    const path = `odRequests/${IDS.requestDraft}/documents/proof.pdf`;
    await assertFails(getBytes(ref(unauthedStorage(), path)));
  });

  it('allows student to upload valid file to own request', async () => {
    await seed(IDS);
    const path = `odRequests/${IDS.requestDraft}/documents/proof.pdf`;
    await assertSucceeds(
      uploadBytes(ref(authedStorage(IDS.studentA), path), pdfBytes, {
        contentType: 'application/pdf',
      })
    );
  });

  it('denies student uploading to another students request path', async () => {
    await seed(IDS);
    const path = `odRequests/${IDS.requestOtherDept}/documents/proof.pdf`;
    await assertFails(
      uploadBytes(ref(authedStorage(IDS.studentA), path), pdfBytes, {
        contentType: 'application/pdf',
      })
    );
  });

  it('denies invalid file type uploads', async () => {
    await seed(IDS);
    const path = `odRequests/${IDS.requestDraft}/documents/malware.exe`;
    await assertFails(
      uploadBytes(ref(authedStorage(IDS.studentA), path), new Uint8Array([1, 2, 3]), {
        contentType: 'application/octet-stream',
      })
    );
  });

  it('allows HOD to read files for department requests', async () => {
    await seed(IDS);
    const path = `odRequests/${IDS.requestDraft}/documents/proof.pdf`;
    await uploadBytes(ref(authedStorage(IDS.studentA), path), pdfBytes, {
      contentType: 'application/pdf',
    });
    await assertSucceeds(getBytes(ref(authedStorage(IDS.hod), path)));
  });

  it('denies HOD reading files for other department requests', async () => {
    await seed(IDS);
    const path = `odRequests/${IDS.requestOtherDept}/documents/proof.pdf`;
    await uploadBytes(ref(authedStorage(IDS.studentB), path), pdfBytes, {
      contentType: 'application/pdf',
    });
    await assertFails(getBytes(ref(authedStorage(IDS.hod), path)));
  });

  it('allows student to delete own uploaded file', async () => {
    await seed(IDS);
    const path = `odRequests/${IDS.requestDraft}/documents/to-delete.pdf`;
    await uploadBytes(ref(authedStorage(IDS.studentA), path), pdfBytes, {
      contentType: 'application/pdf',
    });
    await assertSucceeds(deleteObject(ref(authedStorage(IDS.studentA), path)));
  });

  it('allows admin to read OD document files', async () => {
    await seed(IDS);
    const path = `odRequests/${IDS.requestDraft}/documents/proof.pdf`;
    await uploadBytes(ref(authedStorage(IDS.studentA), path), pdfBytes, {
      contentType: 'application/pdf',
    });
    await assertSucceeds(getBytes(ref(authedStorage(IDS.admin), path)));
  });
});
