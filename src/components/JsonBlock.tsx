import { useI18n } from "../i18n/use-i18n";

type Props = {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
};

export default function JsonBlock({ title, data }: Props) {
  const { t } = useI18n();

  return (
    <div className="response-block">
      <div className="response-block__header">
        <span>{title}</span>
        <span className="response-block__status" data-active={Boolean(data)}>
          {data ? "JSON" : "idle"}
        </span>
      </div>
      <pre className="response-block__body">
        {data ? JSON.stringify(data, null, 2) : t("responses.empty")}
      </pre>
    </div>
  );
}
