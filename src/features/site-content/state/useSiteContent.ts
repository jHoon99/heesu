import { useQuery } from "@tanstack/react-query";
import { getSiteContent } from "../data/getSiteContent";
import { EMPTY_SITE_CONTENT, parseSiteContent, type SiteContent } from "../model/siteContent";

export function useSiteContent(): { content: SiteContent; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["site-content"],
    queryFn: getSiteContent,
    select: parseSiteContent,
  });
  return { content: data ?? EMPTY_SITE_CONTENT, isLoading };
}
