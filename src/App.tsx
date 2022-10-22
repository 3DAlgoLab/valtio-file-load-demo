import React from "react";
import { useDropzone } from "react-dropzone";
import { proxy, ref, useSnapshot } from "valtio";
import localForage from "localforage";

localForage.config({
  name: "Valtio ref demo"
});

const store = proxy<{
  files: File[];
  meta: { name: string; size: number }[];
  savingToDB: boolean;
  loadingFromDB: boolean;
  hasStoredFiles: boolean;
}>({
  // files will be untracked
  files: ref([]),
  meta: [],
  savingToDB: false,
  loadingFromDB: false,
  hasStoredFiles: false
});

localForage.length().then((len) => {
  store.hasStoredFiles = len > 0;
});

const handleDrop = (acceptedFiles: File[]) => {
  acceptedFiles.forEach((f) => store.files.push(f));
  acceptedFiles.forEach(({ name, size }) =>
    store.meta.push({ name, size: size / 1024 / 1024 })
  );
};

const save = async () => {
  store.savingToDB = true;
  let jobs: Promise<Blob>[] = [];
  store.files.forEach(async (file) => {
    const blob = file.slice(0, file.size, file.type);
    jobs.push(localForage.setItem(file.name, blob));
    store.meta.pop();
  });
  await Promise.all(jobs);
  // reset an array in a ref this way
  store.files.splice(0);
  store.savingToDB = false;
  store.hasStoredFiles = true;
};

const load = async () => {
  store.loadingFromDB = true;
  let files: File[] = [];
  await localForage.iterate(function (blob: Blob, name) {
    const file = new File([blob], name);
    files.push(file);
  });
  handleDrop(files);
  localForage.clear();
  store.hasStoredFiles = false;
  store.loadingFromDB = false;
};

const App = () => {
  const onDrop = React.useCallback((files: File[]) => {
    handleDrop(files);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop
  });
  const snap = useSnapshot(store);

  return (
    <main>
      <aside {...getRootProps()}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <p>Drag 'n' drop some files here, or click to select files</p>
        )}
      </aside>
      <h3>Files</h3>
      <ul>
        {snap.meta.map(({ name, size }) => (
          <li key={name}>{`${name} (${size.toFixed(4)} MiB)`}</li>
        ))}
      </ul>
      <>
        <button onClick={() => save()} disabled={snap.meta.length === 0}>
          {snap.savingToDB ? "saving..." : "Save"}
        </button>
        <button onClick={() => load()} disabled={!snap.hasStoredFiles}>
          {snap.loadingFromDB ? "loading..." : "Load"}
        </button>
      </>
    </main>
  );
};

export default App;
