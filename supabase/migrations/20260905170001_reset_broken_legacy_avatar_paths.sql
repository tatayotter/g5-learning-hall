-- Pokemon-sprite userpic files (Spr_RS_*, Spr_FRLG_*, Spr_E_*) were removed from
-- public/userpics/ during the "Sprites, avatars, trash system, and achievements
-- overhaul" cleanup (licensing risk — traced sprite rips). Some children rows
-- still point avatar at those now-deleted files, leaving a broken image on
-- their profile portrait. Reset those rows to the gender-appropriate default
-- userpic (the same fallback userSession.ts already uses for a null avatar).
update children
set avatar = case when gender = 'girl'
  then '/userpics/userpics_premium/ssg3.png'
  else '/userpics/userpics_premium/ssb3.png'
end
where avatar like '/userpics/%'
  and avatar not like '/userpics/userpics_premium/%';
