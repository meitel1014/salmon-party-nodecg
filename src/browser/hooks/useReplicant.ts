import { useCallback, useEffect, useState } from 'react';
import type { ReplicantMap } from '../../nodecg/replicants';

export const useReplicant = <T extends keyof ReplicantMap>(
  name: T
): [ReplicantMap[T] | undefined, (newValue: ReplicantMap[T]) => void] => {
  // 生成は初期化子の戻り値から型推論できる useState で行う（nodecg.Replicant は
  // オーバーロードのため typeof<T> でのインスタンス化ができない）。
  // rep は React の state ではなく「一度だけ生成する外部の可変オブジェクト」で、
  // `.value =` が NodeCG 公式の更新 API のため immutability ルールは誤検知になる。
  const [rep] = useState(() => nodecg.Replicant(name));

  const [value, setValue] = useState<ReplicantMap[T] | undefined>(undefined);
  useEffect(() => {
    const handleChange = (newValue: ReplicantMap[T]) => setValue(newValue);
    rep.on('change', handleChange);
    return () => {
      rep.removeListener('change', handleChange);
    };
  }, [rep]);

  const setReplicant = useCallback(
    (newValue: ReplicantMap[T]) => {
      // eslint-disable-next-line react-hooks/immutability -- Replicant.value への代入は NodeCG 公式の更新 API
      rep.value = newValue;
    },
    [rep]
  );
  return [value, setReplicant];
};
