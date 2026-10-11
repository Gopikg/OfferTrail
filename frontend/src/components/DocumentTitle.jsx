import { useEffect } from "react";

function DocumentTitle({ title, children }) {
  useEffect(() => {
    document.title = `${title} | OfferTrail`;
  }, [title]);

  return children;
}

export default DocumentTitle;
