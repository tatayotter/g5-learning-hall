-- Same cleanup as the `children` table fix, applied to the separate
-- user_avatars table (covers classmate accounts + demo accounts, which
-- aren't rows in `children`). Resolve gender via classmates where possible;
-- fall back to the boy default for accounts with no gender record (demo
-- accounts, which are gender-neutral placeholders).
update user_avatars ua
set avatar = case when c.gender = 'girl'
  then '/userpics/userpics_premium/ssg3.png'
  else '/userpics/userpics_premium/ssb3.png'
end
from (select id, gender from classmates) c
where ua.user_id = c.id
  and ua.avatar like '/userpics/%'
  and ua.avatar not like '/userpics/userpics_premium/%';

update user_avatars
set avatar = '/userpics/userpics_premium/ssb3.png'
where avatar like '/userpics/%'
  and avatar not like '/userpics/userpics_premium/%';
