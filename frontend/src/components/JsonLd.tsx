type JsonLdValue = Record<string, unknown>;

type Props = {
  data: JsonLdValue | JsonLdValue[];
};

/** Скрытая микроразметка schema.org — на странице не отображается. */
export function JsonLd({ data }: Props) {
  const items = Array.isArray(data) ? data : [data];
  if (items.length === 0) return null;

  return (
    <>
      {items.map((item, index) => (
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
          key={index}
          type="application/ld+json"
        />
      ))}
    </>
  );
}
