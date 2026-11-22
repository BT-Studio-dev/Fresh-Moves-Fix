-- Small embedded raster attachments are deleted automatically with their comment.
alter table public.tool_comments add column image_data text;
alter table public.tool_comments add constraint tool_comments_image_data_check
  check (image_data is null or (char_length(image_data) <= 180000 and image_data ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$'));
grant insert (image_data) on public.tool_comments to authenticated;
