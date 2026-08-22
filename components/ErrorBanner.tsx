type Props = {
  message: string | null;
};

export function ErrorBanner({ message }: Props) {
  if (!message) return null;
  return (
    <div className="banner banner-error" role="alert">
      {message}
    </div>
  );
}
